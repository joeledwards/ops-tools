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
    heading = false,
    debugOutput = false
  } = options

  const {
    times,
    start,
    end
  } = momentize(timestamps)

  const startDate = moment.utc(start).startOf('day')
  const endDate = moment.utc(end).startOf('day').add(1, 'days')
  const dayCount = endDate.diff(startDate, 'days')

  let first = startDate
  let last = moment.utc(startDate).add(width, 'days')

  const charts = []

  if (debugOutput) {
    console.info()
    console.info(` start date : ${formatTime(startDate)}`)
    console.info(`   end date : ${formatTime(endDate)}`)
    console.info(`  day count : ${c.orange(dayCount)}`)
    console.info(`      width : ${c.orange(width)}`)
    console.info(`     height : ${c.orange(height)}`)
    console.info(`      label : ${c.green(label)}`)
    console.info(`    heading : ${(heading ? c.green : c.red)(heading)}`)
    console.info()
  }

  // process charts, each containing `width` days
  while (end.diff(first) > 0) {
    if (debugOutput) {
      console.info()
      console.info(' ==== CHART ====')
      console.info(` first : ${formatTime(first)}`)
      console.info(`  last : ${formatTime(last)}`)
    }

    const values = []
    const day = moment.utc(first).add(1, 'days')

    // get the counts for each day in the
    for (let i = 0; i < width && times.length > 0; i++) {
      let count = 0

      while (times.length > 0 && day.diff(times[0]) > 0) {
        count++
        times.shift()
      }

      if (debugOutput) {
        console.info(`  ${formatTime(day)} | ${c.orange(count)} [i=${c.orange(i)} | times=${c.orange(times.length)}]`)
      }

      values.push(count)
      day.add(1, 'days')
    }

    const chart = plot({ values, height, width })
    charts.push((heading || label)
      ? `${chartHeading(first, last, label)}\n${chart}`
      : chart
    )

    first = last
    last = moment.utc(last).add(width, 'days')
    if (end.diff(last) < 1) {
      last = moment.utc(end).add(1, 'days').startOf('day')
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
    times,
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

    buckets.push({ start: rangeStart, count })
  }

  const values = buckets.map(({ count }) => count)
  const chart = plot({ values, height, width })

  return (heading || label)
    ? `${chartHeading(start, end, label)})\n${chart}`
    : chart
}

// Convert timetamps to moments and extract start/end of range.
function momentize (timestamps) {
  const times = r.compose(
    r.sortBy(t => t.valueOf()),
    r.map(time => moment.utc(time))
  )(timestamps)
  const start = r.head(times)
  const end = r.last(times)

  return {
    times,
    start,
    end
  }
}

// Prettier time format
function formatTime (ts) {
  const date = c.blue(ts.format('YYYY-MM-DD'))
  const time = c.yellow(ts.format('HH:mm'))
  return `${date} ${time}`
}

// Generated the chart heading.
function chartHeading (start, end, label = '', labelPad = 11) {
  const startStr = formatTime(start)
  const endStr = formatTime(end)
  const spanStr = c.orange(durations.millis(end.valueOf() - start.valueOf()))
  const labelStr = pad(labelPad, label)

  return `${labelStr} | ${startStr} to ${endStr} (${spanStr})`
}

// Plot values on a chart.
function plot ({
  values,
  width = 60,
  height = 12,
  padding = 12
}) {
  const pad = ' '.repeat(padding)
  if (values.filter(v => v).length < 1) {
    const y = `${pad}┤\n`.repeat(height - 1)
    const x = `${(pad + '0.00 ').slice(-padding)}┼──` + '─'.repeat(width)
    return y + x
  } else {
    return asciichart.plot(values, { height, padding: pad })
  }
}
