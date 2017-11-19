const chalk = require('chalk')
const nsq = require('nsqjs')
const yargs = require('yargs')

const {green, red, yellow} = chalk
const blue = chalk.keyword('lightblue')

function log (message) {
  console.log(yellow(`[${blue(new Date().toISOString())}]`), message)
}

const args = yargs.env('NSQ')
  .option('lookupd-host', {type: 'array', default: 'localhost:4161'})
  .string('topic').require('topic')
  .string('channel').default('channel', 'buzuli')
  .string('clientId').default('clientId', 'buzuli')
  .number('limit').default('limit', 10)
  .boolean('unlimited').default('unlimited', false)
  .argv

const {
  channel,
  clientId,
  limit,
  lookupdHost,
  topic,
  unlimited
} = args

log(`lookupd hosts: ${lookupdHost}`)
log(`        topic: ${topic}`)
log(`      channel: ${channel}`)
log(`        limit: ${limit}`)
log(`    unlimited: ${unlimited}`)
log(`    client-id: ${clientId}`)

const options = {
  lookupdHTTPAddresses: lookupdHost,
  clientId
}

let count = 0
const reader = new nsq.Reader(topic, channel, options)

reader.on('nsqd_connected', () => log(green('connected')))
reader.on('nsqd_closed', () => log(yellow('disconnected')))
reader.on('error', error => log(`${red('error')}: ${error}`))
reader.on('message', msg => {
  count++
  log(msg.body)
  msg.finish()

  if (!unlimited && count >= limit) {
    reader.close()
  }
})

reader.connect()

