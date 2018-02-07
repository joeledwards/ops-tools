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

function handler (argv) {
  const axios = require('axios')
  const durations = require('durations')
  const follow = require('follow')
  const moment = require('moment')
  const {blue, green, orange, red, yellow, emoji} = require('@buzuli/color')

  const throttle = require('@buzuli/throttle')

  let lastId = null
  let lastDoc = null
  let leaderSeq = 0

  const {
    completeDoc,
    fullThrottle,
    url,
    info: reportInfo,
    limit,
    maxDelay,
    minDelay,
    since
  } = argv

  console.log(`url: ${blue(url)}`)

  const notify = throttle({
    reportFunc: () => {
      const ts = `[${blue(new Date().toISOString())}] `
      const seq = `sequence=${orange(leaderSeq || 0)} `
      const id = lastId ? `${yellow(lastId)}` : ''

      let docInfo = ''
      if (lastDoc) {
        const lastVersion = (lastDoc['dist-tags'] || {}).latest
        const version = lastVersion ? `@${green(lastVersion)} ` : ' '
        const pkgSize = Buffer.byteLength(JSON.stringify(lastDoc))
        const pkgSizeColor = pkgSize >= 1000000 ? red : pkgSize >= 100000 ? orange : yellow
        const size = reportInfo ? `${pkgSizeColor(pkgSize)} b - ` : ''
        const lastModified = ((lastDoc.time) || {}).modified
        const age = lastModified ? blue(durations.millis(moment().diff(moment(lastModified)))) : ''
        const doc = (completeDoc && lastDoc) ? `\n${JSON.stringify(lastDoc, null, 2)}` : ''
        docInfo = `${version}(${size}${age})${doc}`
      }

      console.log(`${ts}${seq}${id}${docInfo}`)
    },
    minDelay,
    maxDelay
  })

  let count = 0
  let stop = () => {}
  trackSeq(url, (document = {}) => {
    const {id, seq, doc} = document
    count++
    lastId = id
    leaderSeq = seq || 0
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
  function trackSeq (url, handler) {
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
      handler({seq})

      const feed = new follow.Feed({
        db: url,
        since: seq,
        include_docs: completeDoc || reportInfo
      })

      feed.on('change', handler)
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
}
