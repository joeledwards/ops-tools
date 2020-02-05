module.exports = {
  command: 'npm-downloads [time-window] [...options]',
  desc: 'fetch download count data from api.npmjs.org',
  builder,
  handler
}

const chart = require('../lib/chart')
const moment = require('moment')

function builder (yargs) {
  yargs
    .positional('time-window', {
      type: 'string',
      desc: 'A date, range of dates, or last-(day|week|month|year)',
      coerce: timeWindow => validateTimeWindow(timeWindow),
      default: 'last-day'
    })
    .option('packages', {
      type: 'array',
      desc: 'Limit counts to these packages.',
      alias: ['pkg', 'p']
    })
    .option('range', {
      type: 'boolean',
      desc: 'Perform a range query (instead of a point query).',
      alias: 'r'
    })
    .option('csv', {
      type: 'boolean',
      desc: 'Format download counts as CSV.'
    })
    .option('graph', {
      type: 'boolean',
      desc: 'Graph the downloads.',
      alias: 'g'
    })
}

async function handler (options) {
  try {
    const axios = require('axios')
    const buzJson = require('@buzuli/json')

    const {
      packages,
      range,
      timeWindow,
      graph,
      csv
    } = options

    let url = 'https://api.npmjs.org/downloads'

    url = `${url}/${range ? 'range' : 'point'}/${timeWindow}`

    if (packages) {
      url = `${url}/${packages.join(',')}`
    }

    if (!csv) {
      console.info(`GET ${url}`)
    }

    const { status, data } = await axios({
      method: 'GET',
      url,
      validateStatus: () => true
    })

    if (status === 200) {
      if (graph && range) {
        console.info(
          chart.plot({
            values: Object.values(data.downloads).map(({ downloads: d }) => d),
            padding: 15
          })
        )
      } else if (csv && range) {
        console.info('"date","downloads"')
        Object.values(data.downloads).forEach(({ day, downloads }) => {
          console.info(`"${day}","${downloads}"`)
        })
      } else {
        console.info(buzJson(data))
      }
    } else {
      console.error(`[${status}]\n${buzJson(data)}`)
      process.exit(1)
    }
  } catch (error) {
    console.error(error)
    console.error('Error fetching download counts. Details above 👆')
  }
}

function validateTimeWindow (timeWindow) {
  try {
    return _validateTimeWindow(timeWindow)
  } catch (error) {
    console.error(error)
    throw error
  }
}

function _validateTimeWindow (timeWindow) {
  if (['last-day', 'last-week', 'last-month', 'last-year'].includes(timeWindow)) {
    return timeWindow
  }

  const [, startString, endString] = timeWindow.match(/^(\d{8})[:](\d{8})$/) ||
    timeWindow.match(/^(\d{4}-\d{2}-\d{2})[:](\d{4}-\d{2}-\d{2})$/) ||
    []

  if (startString && endString) {
    const startDate = moment.utc(startString)
    const endDate = moment.utc(endString)

    if (!startDate.isValid()) {
      throw new Error('Invalid start date for time-window')
    }

    if (!endDate.isValid()) {
      throw new Error('Invalid end date for time-window')
    }

    if (endDate.diff(startDate) < 0) {
      throw new Error('Impossible time-window (end before start)')
    }

    return `${startDate.format('YYYY-MM-DD')}:${endDate.format('YYYY-MM-DD')}`
  }

  const [, dateString] = timeWindow.match(/^(\d{8})$/) ||
    timeWindow.match(/^(\d{4}-\d{2}-\d{2})$/) ||
    []
  if (dateString) {
    const date = moment.utc(dateString)

    if (!date.isValid()) {
      throw new Error('Invalid date for time-window')
    }

    return date.format('YYYY-MM-DD')
  }

  throw new Error('Invalid period')
}
