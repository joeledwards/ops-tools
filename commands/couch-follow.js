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
      type: 'string',
      desc: 'start scanning from this point in time (default is now)',
      default: 'now',
      alias: ['s', 'start']
    })
    .option('size', {
      type: 'boolen',
      desc: 'report the estimated size of the document in bytes (streams ALL content)',
      default: false,
      alias: ['S']
    })
}

function handler (argv) {
  const axios = require('axios')
  const follow = require('follow')
  const {blue, green, orange, red, yellow, emoji} = require('@buzuli/color')

  const throttle = require('@buzuli/throttle')

  let lastId = null
  let lastDoc = null
  let leaderSeq = 0

  const {
    completeDoc,
    fullThrottle,
    url,
    limit,
    maxDelay,
    minDelay,
    since,
    size: reportSize
  } = argv

  console.log(`url: ${blue(url)}`)

  const notify = throttle({
    reportFunc: () => {
      const ts = `[${blue(new Date().toISOString())}] `
      const seq = `sequence=${yellow(leaderSeq || 0)} `
      const id = lastId ? `${green(lastId)} ` : ''
      const pkgSize = lastDoc ? Buffer.byteLength(JSON.stringify(lastDoc)) : 0
      const pkgSizeColor = pkgSize >= 1000000 ? red : pkgSize >= 100000 ? orange : yellow
      const size = reportSize ? `(${pkgSizeColor(pkgSize)} bytes)` : ''
      const doc = (completeDoc && lastDoc) ? `\n${JSON.stringify(lastDoc, null, 2)}` : ''
      console.log(`${ts}${seq}${id}${size}${doc}`)
    },
    minDelay,
    maxDelay
  })

  let count = 0
  let stop = () => {}
  trackSeq(url, ({id, seq, doc} = {}) => {
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
    latestSeq(url)
    .then(seq => {
      handler({seq})

      const feed = new follow.Feed({
        db: url,
        since,
        include_docs: completeDoc || reportSize
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
