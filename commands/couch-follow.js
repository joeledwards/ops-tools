module.exports = {
  command: 'couch-follow <url>',
  desc: 'follow a CouchDB change feed',
  builder,
  handler
}

function builder (yargs) {
  return yargs
    .env('COUCH_FOLLOW')
    .option('bind-port', {
      type: 'number',
      desc: 'the port on which the history server should listen',
      default: 31415,
      alias: 'p'
    })
    .option('complete-doc', {
      type: 'boolean',
      desc: 'pull back and render the complete doc on each report (streams ALL content)',
      default: false,
      alias: 'c'
    })
    .option('full-throttle', {
      type: 'boolean',
      desc: 'do not limit the report rate (overrides --min-delay and --max-delay)',
      alias: 'F'
    })
    .option('info', {
      type: 'boolen',
      desc: 'report version, size, and age info (streams full packument)',
      default: false,
      alias: 'i'
    })
    .option('all-info', {
      type: 'boolen',
      desc: 'report attachment size (WARNING: streams all data, including attachments)',
      default: false,
      alias: 'I'
    })
    .option('leveldb', {
      type: 'string',
      desc: 'the LevelDB directory to which history should be written',
      alias: 'L'
    })
    .option('min-delay', {
      type: 'number',
      desc: 'minimum delay between reports',
      default: 1000,
      alias: 'd'
    })
    .option('max-delay', {
      type: 'number',
      desc: 'maximum delay between reports',
      default: null,
      alias: 'D'
    })
    .option('secret', {
      type: 'string',
      desc: 'this is required for non-public (npmE) registries'
    })
    .option('since', {
      type: 'number',
      desc: 'start scanning from this sequence (default is latest)',
      default: -1,
      alias: ['s', 'start']
    })
    .option('slow', {
      type: 'boolean',
      desc: 'use the slow changes parser',
      default: false
    })
}

async function handler (argv) {
  const { red, emoji } = require('@buzuli/color')

  try {
    await followCouch(argv)
  } catch (error) {
    console.error(error)
    console.error(red(emoji.inject(`Fatal error! Details above :point_up:`)))
  }
}

// CouchDB Follower
async function followCouch (argv) {
  const { blue, green, grey, orange, purple, red, yellow, emoji } = require('@buzuli/color')

  const r = require('ramda')
  const axios = require('axios')
  const moment = require('moment')
  const durations = require('durations')

  const ChangesStream = require('@buzuli/changes-stream')
  const throttle = require('@buzuli/throttle')
  const buzJson = require('@buzuli/json')

  let lastRev = null
  let lastId = null
  let lastDoc = null
  let lastSeq = 0
  let lastDel = false

  const {
    completeDoc,
    fullThrottle,
    url,
    info: reportInfo,
    allInfo,
    leveldb,
    maxDelay,
    minDelay,
    secret,
    since,
    slow
  } = argv

  const db = await openDb(leveldb)

  if (leveldb) {
    await historyServer(db, argv)
  }

  console.log(`registry url: ${blue(url)}`)

  const notify = throttle({
    reportFunc: () => {
      const reportWatch = durations.stopwatch().start()
      const now = new Date()
      const ts = `[${blue(now.toISOString())}] `
      const seq = `sequence=${orange(lastSeq || 0)} `
      const id = lastId ? `${yellow(lastId)}` : ''

      const dbRecord = {
        id: lastId,
        rev: lastRev,
        seq: lastSeq,
        readTime: now.toISOString()
      }

      let docInfo = ''
      if (lastDoc) {
        const latestVersion = (lastDoc['dist-tags'] || {}).latest
        const created = moment(((lastDoc.time) || {}).created)
        const lastVersion = r.compose(
          r.head,
          r.reduce(([accTag, accTime], [nextTag, nextTime]) => {
            return (nextTime.diff(accTime) > 0)
              ? [nextTag, nextTime]
              : [accTag, accTime]
          }, [latestVersion, created]),
          r.filter(([tag, time]) => tag !== 'created' && tag !== 'modified'),
          r.map(([tag, time]) => [tag, moment(time)]),
          r.toPairs
        )(lastDoc.time)
        const version = lastVersion ? `@${green(lastVersion)} ` : ' '
        const latest = (latestVersion && latestVersion !== lastVersion) ? `[latest:${purple(latestVersion)}] ` : ''
        const pkgSize = Buffer.byteLength(JSON.stringify(lastDoc))
        const pkgSizeColor = pkgSize >= 1000000 ? red : pkgSize >= 100000 ? orange : yellow
        const size = (reportInfo || allInfo) ? `${pkgSizeColor(pkgSize.toLocaleString())} b -` : ''
        const lastModified = ((lastDoc.time) || {}).modified
        const rev = allInfo ? ` [${formatRev(lastRev)}]` : ''
        const age = lastModified ? ` ${blue(durations.millis(moment(now).diff(moment(lastModified))))}` : ''
        const doc = (completeDoc && lastDoc) ? `\n${buzJson(lastDoc)}` : ''
        const del = lastDel ? red(' DELETED') : ''
        const took = allInfo ? ` ${grey(reportWatch)}` : ''
        docInfo = `${version}${latest}(${size}${age}${del})${rev}${took}${doc}`

        if (db) {
          dbRecord.createdTime = created ? moment(created).toISOString() : undefined
          dbRecord.updateTime = lastModified ? moment(lastModified).toISOString() : undefined
          dbRecord.newestVersion = lastVersion
          dbRecord.latestVersion = latestVersion
          dbRecord.packumentSize = pkgSize
        }
      } else {
        const revStr = lastRev ? `[${formatRev(lastRev)}]` : ''
        const delStr = lastDel ? `(${red('DELETED')})` : ''
        docInfo = `${revStr} ${delStr}`
      }

      if (db) {
        const jsonRecord = JSON.stringify(dbRecord)
        db.put(`pkg:${lastId}:${lastRev}`, jsonRecord)
        db.put(`seq:${lastSeq}`, jsonRecord)

        if (lastDel) {
          db.put(`del:${lastId}:${lastRev}`, jsonRecord)
        }
      }

      console.log(`${ts}${seq}${id}${docInfo}`)
    },
    minDelay,
    maxDelay
  })

  let count = -1
  trackSeq(url, (document = {}) => {
    count++

    if (count < 1) {
      return
    }

    const { id, seq, doc, changes, deleted = false } = document
    lastId = id
    lastRev = changes ? changes[0].rev : undefined
    lastSeq = seq || 0
    lastDoc = doc || {}
    lastDel = deleted

    notify({ force: fullThrottle })
  })

  // This could be problematic. All other operations are synchronous, but this...
  // async function getTarballSize () {
  // }

  function formatRev (rev) {
    if (rev) {
      const [revSeq, revHash] = rev.split('-')
      return `${orange(revSeq)}-${grey(revHash)}`
    } else {
      return purple(rev)
    }
  }

  function latestSeq (url) {
    return axios
      .get(url)
      .then(({ data }) => data.update_seq)
  }

  // Track the latest sequence for a URL
  function trackSeq (url, changeHandler) {
    const errorNotify = throttle({ minDelay, maxDelay: null })
    const reportError = (error, fatal) => {
      errorNotify({
        force: fullThrottle,
        reportFunc: () => {
          console.error(error)
          console.error(
            red(`${fatal ? 'Fatal e' : 'E'}rror tracking offset from leader ${blue(url)}.`),
            emoji.inject('Details above :point_up:')
          )
        }
      })
    }

    // Get the initial sequence
    (
      since < 0
        ? latestSeq(url)
        : Promise.resolve(since)
    )
      .then(seq => {
        changeHandler({ seq: seq - 1 })

        const followOptions = {
          slow,
          db: url,
          since: seq - 1,
          include_docs: completeDoc || reportInfo || allInfo
        }

        if (secret) {
          followOptions.query_params = { sharedFetchSecret: secret }
        }

        const feed = new ChangesStream(followOptions)

        feed.on('readable', () => changeHandler(feed.read()))
        feed.on('error', reportError)
      })
      .catch(error => {
        reportError(error, true)
        process.exit(1)
      })
  }

  function openDb (leveldb) {
    if (!leveldb) {
      return Promise.resolve(undefined)
    }

    return new Promise((resolve, reject) => {
      console.log(`db: ${blue(leveldb)}`)
      const leveldown = require('leveldown')
      const levelup = require('levelup')

      levelup(leveldown(leveldb), (error, db) => error ? reject(error) : resolve(db))
    })
  }
}

// History Server
function historyServer (db, argv) {
  const { blue, green, orange, yellow } = require('@buzuli/color')
  const r = require('ramda')

  const log = msg => console.info(`[${yellow(new Date().toISOString())}] ${msg}`)

  log(`Starting history server...`)

  return new Promise((resolve, reject) => {
    const express = require('express')

    const {
      bindPort
    } = argv

    const app = express()

    // Request records by sequence number
    app.get('/history/sequence', (req, res) => {
      log(`${blue('GET')} ${green('/history/sequence')}${colorQuery(req.query)}`)

      const {
        start,
        end,
        limit,
        reverse
      } = req.query

      const options = {
        gte: 'seq:',
        lt: 'ser:'
      }

      if (start) {
        try {
          const startSeq = parseInt(start)
          options.gte = `seq:${startSeq}`
        } catch (error) {
          return res.status(400).json({ message: `Invalid start sequence: ${start}` })
        }
      }

      if (end) {
        try {
          const endSeq = parseInt(end)
          options.lte = `seq:${endSeq}`
        } catch (error) {
          return res.status(400).json({ message: `Invalid end sequence: ${end}` })
        }
      }

      if (limit) {
        try {
          options.limit = parseInt(limit)
        } catch (error) {
          return res.status(400).json({ message: `Invalid limit: ${limit}` })
        }
      }

      options.reverse = !reverse

      let prefix = null
      res.write('[')
      db.createReadStream(options)
        .on('data', data => {
          if (prefix) {
            res.write(prefix)
          }
          res.write(data.value)
          prefix = ','
        })
        .on('end', () => {
          res.write(']')
          res.send()
        })
    })

    // Request records by package name
    app.get('/history/package', (req, res) => {
      log(`${blue('GET')} ${green('/history/package')}${colorQuery(req.query)}`)

      const {
        name,
        limit,
        reverse
      } = req.query

      const options = {
        gte: 'pkg:',
        lt: 'pkh:'
      }

      if (name) {
        options.gte = `pkg:${name}`
        options.lt = `pkg:${name}_`
      }

      if (limit) {
        try {
          options.limit = parseInt(limit)
        } catch (error) {
          return res.status(400).json({ message: `Invalid limit: ${limit}` })
        }
      }

      options.reverse = !reverse

      let prefix = null
      res.write('[')
      db.createReadStream(options)
        .on('data', data => {
          if (prefix) {
            res.write(prefix)
          } else {
            prefix = ','
          }
          res.write(data.value)
        })
        .on('end', () => {
          res.write(']')
          res.send()
        })
    })

    // Request records by package name
    app.get('/history/deletes', (req, res) => {
      log(`${blue('GET')} ${green('/history/deletes')}${colorQuery(req.query)}`)

      const {
        name,
        limit,
        reverse
      } = req.query

      const options = {
        gte: 'del:',
        lt: 'dem:'
      }

      if (name) {
        options.gte = `pkg:${name}`
        options.lt = `pkg:${name}_`
      }

      if (limit) {
        try {
          options.limit = parseInt(limit)
        } catch (error) {
          return res.status(400).json({ message: `Invalid limit: ${limit}` })
        }
      }

      options.reverse = !reverse

      let prefix = null
      res.write('[')
      db.createReadStream(options)
        .on('data', data => {
          if (prefix) {
            res.write(prefix)
          } else {
            prefix = ','
          }
          res.write(data.value)
        })
        .on('end', () => {
          res.write(']')
          res.send()
        })
    })

    // Continuous feed of changes (with optional context count)
    app.get('/feed', (req, res) => {
      const {
        context,
        limit
      } = req.query

      let ctxt = 0
      if (context) {
        try {
          ctxt = parseInt(context)
        } catch (error) {
          return res.status(400).json({ message: `Invalid value for context: ${context}` })
        }
      }

      let max = 0
      if (limit) {
        try {
          max = parseInt(limit)
        } catch (error) {
          return res.status(400).json({ message: `Invalid value for limit: ${limit}` })
        }
      }

      log(`${blue('GET')} ${green('/feed')}${colorQuery(req.query)}`)
      log(`  context records : ${ctxt}`)
      log(`      new records : ${max}`)

      // TODO:
      // - query ctxt records from LevelDB
      // - push the context changes first
      // - push every new change as it arrives
      //   (this will require introduction of an emitter
      //    from which the database writer and each feed
      //    receives changes)
    })

    app.get('/routes', (req, res) => {
      res.status(200).json(
        app._router.stack
          .filter(r => r.route)
          .map(
            ({
              route: {
                path,
                stack: [{ method }] = []
              } = {}
            }) => ({ method, path })
          )
      )
    })

    function colorQuery (queryString) {
      const qs = r.compose(
        r.join('&'),
        r.map(([k, v]) => `${yellow(k)}=${blue(v)}`),
        r.toPairs
      )(queryString || {})
      return qs ? ('?' + qs) : ''
    }

    app.listen(bindPort, () => {
      log(`History HTTP server is listening on port ${orange(bindPort)}`)
      resolve()
    })
  })
}
