const chalk = require('chalk')
const nsq = require('nsqjs')
const yargs = require('yargs')

const log = require('../lib/log')
const {blue, green, red, yellow} = require('../lib/color')

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

log.info(`lookupd hosts: ${lookupdHost}`)
log.info(`        topic: ${topic}`)
log.info(`      channel: ${channel}`)
log.info(`        limit: ${limit}`)
log.info(`    unlimited: ${unlimited}`)
log.info(`    client-id: ${clientId}`)

const options = {
  lookupdHTTPAddresses: lookupdHost,
  clientId
}

let count = 0
const reader = new nsq.Reader(topic, channel, options)

reader.on('nsqd_connected', () => log.info(green('connected')))
reader.on('nsqd_closed', () => log.info(yellow('disconnected')))
reader.on('error', error => log.error('error', ':', error))
reader.on('message', msg => {
  count++
  log.info(msg.body)
  msg.finish()

  if (!unlimited && count >= limit) {
    reader.close()
  }
})

reader.connect()

