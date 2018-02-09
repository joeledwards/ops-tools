module.exports = {
  command: 'proxy <target-url>',
  desc: 'proxies to a remote URL and logs traffic for debugging',
  builder,
  handler
}

function builder (yargs) {
  yargs
  .option('bind-port', {
    type: 'number',
    desc: 'port on which the proxy server should listen',
    default: 8118
  })
  .option('bind-host', {
    type: 'string',
    desc: 'host on which the proxy server should listen',
    default: '0.0.0.0'
  })
}

function handler ({bindPort, bindHost, targetUrl}) {
  require('log-a-log')()

  const {green, orange} = require('@buzuli/color')
  const http = require('http')
  const httpProxy = require('http-proxy')

  const proxy = httpProxy.createProxy({
  })

  proxy.on('error', error => {
    console.error(error)
  })

  let nextId = 0
  const server = http.createServer((req, res) => {
    const id = nextId++
    console.info(`[${orange(id)}] ${orange(req.method)} ${green(req.url)}`)

    proxy.web(req, res, {
      target: targetUrl,
      start: 'node bin/ops.js'
    })
  })

  server.listen(bindPort, bindHost, () => {
    console.info(`${bindHost}:${bindPort} => ${targetUrl}`)
    console.info('Proxy server listening...')
  })
}
