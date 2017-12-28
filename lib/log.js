const {blue, yellow} = require('@buzuli/color')

function timestamp () {
  return yellow(`[${blue(new Date().toISOString())}]`)
}

function info (message) {
  const args = [timestamp(), ...arguments]
  console.info(...args)
}

function error (message) {
  const args = [timestamp(), ...arguments]
  console.error(...args)
}

module.exports = {
  error,
  info
}
