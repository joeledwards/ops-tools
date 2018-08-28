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
    .option('columns', {
      type: 'number',
      desc: 'number of columns for publishes chart',
      default: 60,
      alias: 'c'
    })
    /* Add this next
    .option('months', {
      type: 'boolean',
      desc: 'plot day counts with a separate chart for each month',
      deafult: false,
      alias: 'm'
    })
    */
}

async function handler ({pkg, json, columns}) {
  try {
    const c = require('@buzuli/color')
    const r = require('ramda')
    const axios = require('axios')
    const moment = require('moment')
    const buzJson = require('@buzuli/json')
    const durations = require('durations')
    const asciichart = require('asciichart')

    const url = `https://registry.npmjs.com/${encodeURIComponent(pkg)}`

    const {status, data} = await axios({
      method: 'get',
      url,
      validateStatus: () => true
    })

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
        versionCount,
        latest: serializableVersion(latest),
        oldest: serializableVersion(oldest),
        newest: serializableVersion(newest)
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

      console.info(`${pkgStr}`)
      console.info(`  Count : ${countStr}`)
      console.info(` Oldest : ${formatVersion(oldest)}`)
      console.info(` Latest : ${formatVersion(latest)}`)
      console.info(` Newest : ${formatVersion(newest)}`)

      const maxBuckets = columns
      const buckets = []

      const times = r.compose(
        r.sortBy(t => t.valueOf()),
        r.map(([_version, time]) => moment(time).utc()),
        r.filter(([version, _time]) => version !== 'created' && version !== 'modified'),
        r.toPairs
      )(publishTimes)

      const start = r.head(times)
      const end = r.last(times)
      const fullRange = end.valueOf() - start.valueOf()
      const bucketCount = Math.max(
        1, Math.min(fullRange, maxBuckets)
      )

      if (bucketCount > 1) {
        const partitionRemainder = fullRange % bucketCount
        const stepCount = bucketCount - ((partitionRemainder > 0) ? 1 : 0)
        const bucketStep = Math.floor(fullRange / stepCount)

        let tIdx = 0
        for (let i = 0; i < bucketCount; i++) {
          const rangeStart = start.valueOf() + i * bucketStep
          const nextRange = rangeStart + bucketStep
          let inRange = true
          let count = 0

          while (inRange) {
            const time = times[tIdx]
            if (time < nextRange) {
              count++
              tIdx++
            } else {
              inRange = false
            }
          }

          buckets.push({start: rangeStart, count})
        }

        const formatTime = ts => {
          const date = c.blue(ts.format('YYYY-MM-DD'))
          const time = c.yellow(ts.format('HH:mm'))
          return `${date} ${time}`
        }

        const chartData = buckets.map(({count}) => count)
        const startStr = formatTime(start)
        const endStr = formatTime(end)
        const spanStr = c.orange(durations.millis(fullRange))

        console.info()
        console.info(`  Publishes | ${startStr} to ${endStr} (${spanStr})`)
        const versionChart = asciichart.plot(chartData, {height: 12})
        console.info(versionChart)
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
