module.exports = {
  command: 'couch-offset <leader-url>',
  desc: 'track a CouchDB and the offset of its follower(s)',
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
    .option('follower-url', {
      type: 'array',
      desc: 'url of follower (may supply multiple time)',
      alias: ['f']
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
      default: 5000,
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
  const {red, orange, yellow, blue, emoji} = require('@buzuli/color')

  const throttle = require('@buzuli/throttle')

  let count = 0
  let lastDoc = null 
  let leaderSeq = 0

  const {
    completeDoc,
    followerUrl: followers,
    fullThrottle,
    leaderUrl,
    maxDelay,
    minDelay,
    since,
    size: reportSize,
    unlimited
  } = argv

  console.log(`leader: ${blue(leaderUrl)}`)
  console.log(`followers: ${orange(followers)}`)

  const notify = throttle({
    reportFunc: () => {
      const ts = `[${blue(new Date().toISOString())}] `
      const seq = `sequence=${yellow(leaderSeq || 0)} `
      const size = reportSize ? `(${yellow(lastDoc ? Buffer.byteLength(JSON.stringify(lastDoc)) : 0)} bytes)` : ''
      const doc = (completeDoc && lastDoc) ? `\n${JSON.stringify(lastDoc, null, 2)}` : ''
      console.log(`${ts}${seq}${size}${doc}`)
    },
    minDelay,
    maxDelay
  })

  trackSeq(leaderUrl, ({seq, doc} = {}) => {
    leaderSeq = seq || 0
    lastDoc = doc
    notify({force: fullThrottle})
  })

  function latestSeq (url) {
    return axios
      .get(url)
      .then(({data}) => data.update_seq)
  }

  // Track the latest sequence for a URL
  function trackSeq (url, handler) {
    const notify = throttle({minDelay, maxDelay: null})
    const reportError = (error) => {
      notify({
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
      handler(seq)

      // Now follow all sequence changes
      follow({
        db: url,
        since,
        //include_docs: completeDoc || reportSize
      }, (error, change) => {
        if (error) {
          reportError(error)
        } else {
          handler(change)
        }
      })
    })
    .catch(error => reportError(error))
  }
}
