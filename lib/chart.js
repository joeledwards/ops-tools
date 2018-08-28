module.exports = {
  times: chartTimes
}

function chartTimes ({
  times: timestamps,
  label,
  width = 60,
  height = 12,
  heading = true
} = {}) {
  const c = require('@buzuli/color')
  const r = require('ramda')
  const moment = require('moment')
  const durations = require('durations')
  const asciichart = require('asciichart')

  const pad = require('./pad')

  const maxBuckets = width
  const buckets = []

  const times = r.compose(
    r.sortBy(t => t.valueOf()),
    r.map(time => moment(time).utc())
  )(timestamps)

  const start = r.head(times)
  const end = r.last(times)
  const fullRange = end.valueOf() - start.valueOf()
  const bucketCount = Math.max(1, Math.min(fullRange, maxBuckets))

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
  const labelStr = pad(11, label)

  const chart = asciichart.plot(chartData, {height})
  return heading
    ? `${labelStr} | ${startStr} to ${endStr} (${spanStr})\n${chart}`
    : chart
}
