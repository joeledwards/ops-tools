module.exports = {
  command: 'site-poll <url>',
  desc: 'Check on the status of a site',
  handler
}

function handler ({url}) {
  require('log-a-log')()

  const axios = require('axios')
  const {colorCode} = require('../lib/http')
  const {red, yellow, blue, emoji} = require('@buzuli/color')

  console.log(`Polling status of ${blue(url)}`)

  pollStatus(url)

  function pollStatus (url) {
    const options = {
      timeout: 2500,
      validateStatus: status => true
    }

    axios.get(url, options)
    .then(({status, data}) => {
      if (status === 200) {
        console.log(
          `[${colorCode(status)}]`,
          'Site is online',
          emoji.inject(':white_check_mark:')
        )
      } else {
        console.warn(
          `[${colorCode(status)}]`,
          'Site is offline',
          emoji.inject(':warning:')
        )
      }
    })
    .catch(error => {
      if (error.code) {
        console.error(
          red(`Error connecting:`),
          yellow(error.code),
          `: ${error.message}`,
          error.message.includes('timeout')
            ? emoji.inject(':stopwatch:')
            : emoji.inject(':no_entry_sign:')
        )
      } else {
        console.error(error)
      }
    })
    .then(() => setTimeout(() => pollStatus(url), 15000))
  }
}
