module.exports = {
  command: 'npm-versions <pkg>',
  desc: 'provide a summary of package version info for an npm package',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .options('extended', {
      type: 'boolean',
      desc: 'output all versions',
      default: false,
      alias: 'x'
    })
    .option('json', {
      type: 'boolean',
      desc: 'output summary as json',
      default: false,
      alias: 'j'
    })
    .option('registry', {
      type: 'string',
      desc: 'base URL of the registry',
      default: 'https://registry.npmjs.org',
      alias: 'r'
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

async function handler (options) {
  try {
    const {
      extended,
      json,
      registry,
      pkg,
      height,
      width,
      days,
      timings
    } = options

    const durations = require('durations')
    const watch = durations.stopwatch().start()

    const c = require('@buzuli/color')
    const r = require('ramda')
    const url = require('../lib/url')
    const axios = require('axios')
    const moment = require('moment')
    const buzJson = require('@buzuli/json')

    const chart = require('../lib/chart')

    const baseUrl = url.base(url.coerce(registry))
    const pkgUrl = url.resolve(baseUrl, encodeURIComponent(pkg))

    const fetchWatch = durations.stopwatch().start()
    const { status, data } = await axios({
      method: 'get',
      url: pkgUrl,
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

    const { time: publishTimes, versions, 'dist-tags': tags } = data

    const oldest = r.compose(
      r.head,
      r.sortBy(({ time }) => time.valueOf()),
      r.filter(({ version }) => !['created', 'modified'].includes(version)),
      r.map(([version, time]) => ({ time: moment.utc(time), version })),
      r.toPairs
    )(publishTimes)

    const newest = r.compose(
      r.last,
      r.sortBy(({ time }) => time.valueOf()),
      r.filter(({ version }) => !['created', 'modified'].includes(version)),
      r.map(([version, time]) => ({ time: moment.utc(time), version })),
      r.toPairs
    )(publishTimes)

    const latestVersion = tags.latest
    const latest = r.compose(
      r.head,
      r.filter(({ version }) => version === latestVersion),
      r.filter(({ version }) => !['created', 'modified'].includes(version)),
      r.map(([version, time]) => ({ time: moment.utc(time), version })),
      r.toPairs
    )(publishTimes)

    const versionCount = Object.keys(versions).length
    const serializableVersion = ({ version, time }) => ({
      version,
      time: time.toISOString()
    })

    if (json) {
      const record = {
        publish_times: extended ? publishTimes : undefined,
        registry: baseUrl,
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
      const registryStr = `${c.grey('@')} ${c.blue(baseUrl)}`

      const formatVersion = ({ version, time }) => {
        const versionStr = c.green(version)
        const timeStr = c.blue(time.toISOString())
        const age = durations.millis(moment.utc().diff(time))
        const ageStr = c.orange(age)
        return `${versionStr} [${timeStr} | ${ageStr}]`
      }

      if (extended) {
        r.compose(
          r.map(formatVersion),
          r.sortBy(({ time }) => time.toISOString()),
          r.map(([version, time]) => ({ time: moment.utc(time), version })),
          r.toPairs
        )(publishTimes).forEach(v => console.log(v))
        console.info()
      }

      console.info(`${pkgStr} | ${countStr} versions ${registryStr}`)
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
        console.info('=== Times ⏱  ==============')
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
