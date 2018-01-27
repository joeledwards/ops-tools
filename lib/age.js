module.exports = age

const moment = require('moment')
const {millis} = require('durations')

function age (start, end) {
  const then = moment(start)
  const now = end ? moment(end) : moment()
  const age = millis(now.diff(then))

  return age
}
