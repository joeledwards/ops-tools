module.exports = {
  command: 'salt',
  desc: 'generate a url-safe, base64 encoded salt for use in sharing resources',
  handler
}

function handler () {
  const uuid = require('uuid/v4')
  const salt = Buffer.from(`${uuid()}${uuid()}`).toString('base64').replace('+', '-').replace('/', '_')
  console.info(salt)
}
