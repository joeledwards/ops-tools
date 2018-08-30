module.exports = {
  command: 'package-versions <pkg>',
  desc: 'provide a summary of package version info',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('json', {
      type: 'boolean',
      desc: 'output summary as json',
      default: false,
      alias: 'j'
    })
    .option('height', {
      type: 'number',
      desc: 'height of the publish frequency chart',
      alias: 'h'
    })
    .option('width', {
      type: 'number',
      desc: 'width of the publish frequency chart',
      default: 60,
      alias: 'w'
    })
    .option('days', {
      type: 'boolean',
      desc: 'chart each day individually, showing multiple lines of plots if necessary',
      default: false,
      alias: 'd'
    })
    .options('timings', {
      type: 'boolean',
      desc: 'report timing metadata (how long did fetch and report generation)',
      default: false,
      alias: 't'
    })
}

async function handler ({pkg, json, height, width, days, timings}) {
  try {
    const durations = require('durations')
    const watch = durations.stopwatch().start()

    const c = require('@buzuli/color')
    const r = require('ramda')
    const axios = require('axios')
    const moment = require('moment')
    const buzJson = require('@buzuli/json')

    const chart = require('../lib/chart')

    const url = `https://registry.npmjs.com/${encodeURIComponent(pkg)}`

    const fetchWatch = durations.stopwatch().start()
    const {status, data} = await axios({
      method: 'get',
      url,
      validateStatus: () => true
    })
    fetchWatch.stop()

    const dataWatch = durations.stopwatch().start()
    if (status !== 200) {
      console.error(buzJson({
        status,
        ...(await collectError(data))
      }))
      process.exit(1)
    }

    const {time: publishTimes, versions, 'dist-tags': tags} = data

    const oldest = r.compose(
      r.head,
      r.sortBy(({time}) => time.valueOf()),
      r.filter(({version}) => !['created', 'modified'].includes(version)),
      r.map(([version, time]) => ({time: moment(time).utc(), version})),
      r.toPairs
    )(publishTimes)

    const newest = r.compose(
      r.last,
      r.sortBy(({time}) => time.valueOf()),
      r.filter(({version}) => !['created', 'modified'].includes(version)),
      r.map(([version, time]) => ({time: moment(time).utc(), version})),
      r.toPairs
    )(publishTimes)

    let latestVersion = tags.latest
    let latest = r.compose(
      r.head,
      r.filter(({version}) => version === latestVersion),
      r.filter(({version}) => !['created', 'modified'].includes(version)),
      r.map(([version, time]) => ({time: moment(time).utc(), version})),
      r.toPairs
    )(publishTimes)

    let versionCount = Object.keys(versions).length
    const serializableVersion = ({version, time}) => ({
      version,
      time: time.toISOString()
    })

    if (json) {
      const record = {
        name: pkg,
        versions: versionCount,
        latest: serializableVersion(latest),
        oldest: serializableVersion(oldest),
        newest: serializableVersion(newest)
      }

      if (timings) {
        record.timings = {
          fetch: fetchWatch.duration().nanos() / 1000000000.0,
          data: dataWatch.duration().nanos() / 1000000000.0,
          total: watch.duration().nanos() / 1000000000.0
        }
      }

      console.info(buzJson(record))
    } else {
      const pkgStr = c.yellow.bold(pkg)
      const countStr = c.orange(versionCount)

      const formatVersion = ({version, time}) => {
        const versionStr = c.green(version)
        const timeStr = c.blue(time.toISOString())
        const age = durations.millis(moment.utc().diff(time))
        const ageStr = c.orange(age)
        return `${versionStr} [${timeStr} | ${ageStr}]`
      }

      console.info(`${pkgStr} | ${countStr} versions`)
      console.info()
      console.info(`  Oldest : ${formatVersion(oldest)}`)
      console.info(`  Latest : ${formatVersion(latest)}`)
      console.info(`  Newest : ${formatVersion(newest)}`)
      console.info()

      const timestamps = r.compose(
        r.map(([_version, time]) => time),
        r.filter(([version, _time]) => version !== 'created' && version !== 'modified'),
        r.toPairs
      )(publishTimes)

      dataWatch.stop()
      const chartWatch = durations.stopwatch().start()

      if (timestamps.length > 1) {
        if (days) {
          console.log(chart.days({
            times: timestamps,
            label: 'Publishes',
            width,
            height: height || 5,
            meta: {
            }
          }))
        } else {
          console.log(chart.times({
            times: timestamps,
            label: 'Publishes',
            width,
            height: height || 12
          }))
        }
      }

      chartWatch.stop()
      watch.stop()

      if (timings) {
        console.info()
        console.info(`=== Times ⏱  ==============`)
        console.info(`  fetch : ${c.orange(fetchWatch)}`)
        console.info(`   data : ${c.orange(dataWatch)}`)
        console.info(`  chart : ${c.orange(chartWatch)}`)
        console.info(`  total : ${c.orange(watch)}`)
      }
    }
  } catch (error) {
    console.error('Fatal error fetching version counts:', error)
  }
}

function collectError (body) {
  if (body === null || body === undefined) {
    return Promise.resolve({})
  } else if (typeof (body.on) === 'function') {
    return new Promise((resolve, reject) => {
      const parts = []
      body.on('data', data => parts.push(data))
      body.once('end', () => resolve(Buffer.concat(parts).toString()))
      body.once('error', error => reject(error))
    })
  } else {
    return Promise.resolve(body)
  }
}
