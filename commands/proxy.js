module.exports = {
  command: 'proxy <url>',
  desc: 'proxies to a remote URL and logs traffic for debugging',
  builder,
  handler
}

function builder (yargs) {
}

function handler ({url}) {
  require('log-a-log')

  // const httpProxy = require('http-proxy')

  console.log('Not implemented yet. Check back later!')
}
