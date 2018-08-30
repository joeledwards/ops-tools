const { blue, yellow } = require('@buzuli/color')

function timestamp () {
  return yellow(`[${blue(new Date().toISOString())}]`)
}

function info () {
  const args = [timestamp(), ...arguments]
  console.info(...args)
}

function error () {
  const args = [timestamp(), ...arguments]
  console.error(...args)
}

module.exports = {
  error,
  info
}
