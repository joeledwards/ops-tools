module.exports = {
  color,
  diff,
  parse
}

const c = require('@buzuli/color')
const moment = require('moment')
const durations = require('durations')

function parse (time, utc = true) {
  return moment.utc(time)
}

function diff (start, end) {
  return durations.millis(parse(end).diff(parse(start)))
}

function color (time, utc = true, millis = true) {
  const ts = parse(time, utc)
  const y = c.green(ts.format('YYYY'))
  const m = c.green(ts.format('MM'))
  const d = c.green(ts.format('DD'))
  const hr = c.yellow(ts.format('HH'))
  const min = c.yellow(ts.format('mm'))
  const sec = c.yellow(ts.format('ss'))
  const ms = c.orange(ts.format('SSS'))

  return `${y}-${m}-${d}T${hr}:${min}:${sec}${millis ? ('.' + ms) : ''}Z`
}
