module.exports = {
  command: 'couch-follow <url>',
  desc: 'follow a CouchDB change feed',
  builder,
  handler
}

function builder (yargs) {
  return yargs
    .option('complete-doc', {
      type: 'boolean',
      desc: 'pull back and render the complete doc on each report (streams ALL content)',
      default: false,
      alias: ['c']
    })
    .option('full-throttle', {
      type: 'boolean',
      desc: 'do not limit the report rate (overrides --min-delay and --max-delay)',
      alias: ['F']
    })
    .option('info', {
      type: 'boolen',
      desc: 'report version, size, and age info (streams ALL content)',
      default: false,
      alias: ['i']
    })
    .option('leveldb', {
      type: 'string',
      desc: 'the LevelDB directory to which history should be written',
      alias: ['L']
    })
    .option('limit', {
      type: 'number',
      desc: 'stop after a fixed number of documents are retrieved',
      alias: ['l']
    })
    .option('min-delay', {
      type: 'number',
      desc: 'minimum delay between reports',
      default: 1000,
      alias: ['d']
    })
    .option('max-delay', {
      type: 'number',
      desc: 'maximum delay between reports',
      default: null,
      alias: ['D']
    })
    .option('since', {
      type: 'number',
      desc: 'start scanning from this sequence (default is latest)',
      default: -1,
      alias: ['s', 'start']
    })
}

async function handler (argv) {
  const {red, emoji} = require('@buzuli/color')

  try {
    await followCouch(argv)
  } catch (error) {
    console.error(error)
    console.error(red(emoji.inject(`Fatal error! Details above :point_up:`)))
  }
}

async function followCouch (argv) {
  const {blue, green, orange, purple, red, yellow, emoji} = require('@buzuli/color')

  const axios = require('axios')
  const durations = require('durations')
  const follow = require('follow')
  const moment = require('moment')
  const r = require('ramda')

  const throttle = require('@buzuli/throttle')
  const buzJson = require('@buzuli/json')

  let lastRev = null
  let lastId = null
  let lastDoc = null
  let lastSeq = 0

  const {
    completeDoc,
    fullThrottle,
    url,
    info: reportInfo,
    leveldb,
    limit,
    maxDelay,
    minDelay,
    since
  } = argv

  const db = await openDb(leveldb)

  console.log(`url: ${blue(url)}`)

  const notify = throttle({
    reportFunc: () => {
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
        const size = reportInfo ? `${pkgSizeColor(pkgSize.toLocaleString())} b - ` : ''
        const lastModified = ((lastDoc.time) || {}).modified
        const age = lastModified ? blue(durations.millis(moment(now).diff(moment(lastModified)))) : ''
        const doc = (completeDoc && lastDoc) ? `\n${buzJson(lastDoc)}` : ''
        docInfo = `${version}${latest}(${size}${age})${doc}`

        if (db) {
          dbRecord.createdTime = created ? moment(created).toISOString() : undefined
          dbRecord.updateTime = lastModified ? moment(lastModified).toISOString() : undefined
          dbRecord.newestVersion = lastVersion
          dbRecord.latestVersion = latestVersion
          dbRecord.packumentSize = pkgSize
        }
      } else {
        docInfo = lastRev ? `[${green(lastRev)}]` : ''
      }

      if (db) {
        const jsonRecord = JSON.stringify(dbRecord)
        db.put(`id:${lastId}:${lastRev}:${lastSeq}`, jsonRecord)
        db.put(`seq:${lastSeq}:${lastId}:${lastRev}`, jsonRecord)
      }

      console.log(`${ts}${seq}${id}${docInfo}`)
    },
    minDelay,
    maxDelay
  })

  let count = 0
  let stop = () => {}
  trackSeq(url, (document = {}) => {
    const {id, seq, doc, changes} = document
    count++
    lastId = id
    lastRev = changes ? changes[0].rev : undefined
    lastSeq = seq || 0
    lastDoc = doc
    notify({force: fullThrottle})

    if (count >= limit) {
      stop()
    }
  })

  function latestSeq (url) {
    return axios
      .get(url)
      .then(({data}) => data.update_seq)
  }

  // Track the latest sequence for a URL
  function trackSeq (url, changeHandler) {
    const errorNotify = throttle({minDelay, maxDelay: null})
    const reportError = (error) => {
      errorNotify({
        force: fullThrottle,
        reportFunc: () => {
          console.error(error)
          console.error(
            red(`Error tracking offset from leader ${blue(url)}.`),
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
      changeHandler({seq})

      const feed = new follow.Feed({
        db: url,
        since: seq,
        include_docs: completeDoc || reportInfo
      })

      feed.on('change', changeHandler)
      feed.on('error', reportError)
      feed.on('stop', () => console.log(`Halted after receiving ${orange(count)} sequences.`))

      feed.follow()

      stop = () => {
        errorNotify({halt: true})
        notify({halt: true, force: true})
        feed.stop()
      }
    })
    .catch(error => reportError(error))
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
