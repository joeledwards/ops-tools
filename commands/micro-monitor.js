module.exports = {
  command: 'micro-monitor <url>',
  desc: 'check the status of a server running micro-monitor',
  handler
}

function handler ({url}) {
  const {blue, red, yellow, emoji} = require('@buzuli/color')
  const buzJson = require('@buzuli/json')
  const {colorCode} = require('../lib/http')

  require('axios')({
    method: 'get',
    url: `${url}/_monitor/status`,
    validateStatus: () => true
  })
    .then(({status, statusText, data, headers}) => {
      const [code, text] = colorCode(status, statusText)
      const response = (headers['content-type'] || '').match(/json$/)
        ? buzJson(data)
        : data
      console.info(`[${code}] ${text}\n${response}`)
    })
    .catch(error => {
      console.error(error)
      console.error(red(emoji.inject(`Error fetching state from ${blue(url)} [${yellow(error.message)}]. More detail above :point_up:`)))
    })
}
