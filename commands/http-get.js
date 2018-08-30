module.exports = {
  command: 'http-get <url>',
  desc: 'simple http GET against a URL',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('timeout', {
      type: 'number',
      desc: 'max time (in milliseconds) to wait for a connection',
      default: 5000,
      alias: ['t']
    })
}

function handler ({ timeout, url }) {
  const { colorCode } = require('../lib/http')
  const { blue, gray } = require('@buzuli/color')
  const r = require('ramda')

  const options = {
    method: 'get',
    url,
    timeout: timeout,
    validateStatus: status => true
  }

  require('axios')(options)
    .then(resp => {
      const { data, headers, status, statusText } = resp

      const [codeColored, textColored] = colorCode(status, statusText)
      console.log(`[${codeColored}] ${textColored}`)

      const maxHeaderLength = r.compose(r.reduce(r.max, 0), r.map(h => h.length), r.keys)(headers)
      r.compose(r.sortBy(([k, v]) => k), r.toPairs)(headers)
        .forEach(([name, value]) => {
          const pad = ' '.repeat(maxHeaderLength - name.length)
          console.log(`${pad}${gray(name)} : ${blue(value)}`)
        })

      console.log()
      console.log(JSON.stringify(data, null, 2))
    })
    .catch(error => {
      console.error(`Error fetching ${url} :`, error)
      process.exit(1)
    })
}
