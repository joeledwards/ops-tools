const c = require('@buzuli/color')
const r = require('ramda')
const moment = require('moment')
const durations = require('durations')
const asciichart = require('asciichart')

const pad = require('./pad')

module.exports = {
  days: chartDays,
  plot,
  times: chartTimes
}

// Generate enough charts to display each day as its own point on
// the chart's x-axis.
function chartDays (options) {
  const {
    times: timestamps,
    label,
    width = 60,
    height = 12,
    heading = false
  } = options

  const {
    times,
    start,
    end
  } = momentize(timestamps)

  const startDate = m(start).startOf('day')
  const endDate = m(end).startOf('day')
  const dayCount = endDate.diff(startDate, 'days') + 1

  let first = startDate
  let last = moment(startDate).add(width, 'days')

  const charts = []
  while (end.compare(first) > 0) {
    const headingStr = heading(first, last, label)
    const chart = plot({values, height})
    charts.push(`${headingStr}\n${chart}`)
    first = last
    last = moment(last).add(width, 'days')
    if (end.diff(last) < 1) {
      last = moment(end).add(1, 'days').startOf('day')
    }
  }

  return charts.join('\n\n')
}

// Chart the supplied times, grouping them into chunks of equal
// duration. Generates a single chart.
function chartTimes ({
  times: timestamps,
  label,
  width = 60,
  height = 12,
  heading = false
}) {
  const maxBuckets = width
  const buckets = []

  const {
    timest,
    start,
    end
  } = momentize(timestamps)

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
  const chart = plot({values, height})

  return (heading || label)
    ? `${heading(start, end, label)})\n${chart}`
    : chart
}

// Convert timetamps to moments and extract start/end of range.
function momentize (timestamps) {
  const times = r.compose(
    r.sortBy(t => t.valueOf()),
    r.map(time => moment(time).utc())
  )(timestamps)
  const start = r.head(times)
  const end = r.last(times)

  return {
    times,
    start,
    end
  }
}

// Generated the chart heading.
function heading (start, end, label = '') {
  const startStr = formatTime(start)
  const endStr = formatTime(end)
  const spanStr = c.orange(durations.millis(fullRange))
  const labelStr = pad(11, label)

  return `${labelStr} | ${startStr} to ${endStr} (${spanStr})`
}

// Plot values on a chart.
function plot ({
  values,
  height = 12
}) {
  return asciichart.plot(values, {height})
}
