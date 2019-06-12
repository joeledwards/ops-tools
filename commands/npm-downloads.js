module.exports = {
  command: 'npm-downloads',
  desc: 'fetch download count data from api.npmjs.org',
  builder,
  handler
}

function builder (yargs) {
  const moment = require('moment')

  yargs
    .option('date', {
      type: 'string',
      desc: 'fetch counts for this date',
      coerce: date => moment.utc(date).format('YYYY-MM-DD'),
      alias: 'd'
    })
    .option('package', {
      type: 'string',
      desc: 'limit counts to this package',
      alias: ['pkg', 'p']
    })
    .option('range', {
      type: 'string',
      desc: 'the date range to fetch',
      alias: 'r'
    })
}

async function handler (options) {
  try {
    const axios = require('axios')
    const buzJson = require('@buzuli/json')

    const {
      date,
      package: pkg,
      range
    } = options

    let url = 'https://api.npmjs.org/downloads'

    if (date) {
      url = `${url}/point/${date}`
    } else if (range) {
      url = `${url}/range/${range}`
    } else {
      url = `${url}/point/last-day`
    }

    if (pkg) {
      url = `${url}/${pkg}`
    }

    console.info(`GET ${url}`)

    const { status, data } = await axios({
      method: 'GET',
      url,
      validateStatus: () => true
    })

    if (status === 200) {
      console.info(buzJson(data))
    } else {
      console.error(`[${status}]\n${buzJson(data)}`)
      process.exit(1)
    }
  } catch (error) {
    console.error(error)
    console.error('Error fetching download counts. Details above 👆')
  }
}
