module.exports = {
  command: 'salt',
  desc: 'generate a url-safe, base64 encoded salt for use in sharing resources',
  handler
}

function handler () {
  const uuid = require('uuid')
  const salt = Buffer.from(`${uuid.v4()}${uuid.v4()}`).toString('base64').replace('+', '-').replace('/', '_')
  console.info(salt)
}
