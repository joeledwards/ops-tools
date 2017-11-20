const chalk = require('chalk')
const durations = require('durations')
const nsq = require('nsqjs')

const log = require('../../lib/log')
const {green, red, yellow} = require('../../lib/color')

const options = {
  lookupdHTTPAddresses: ['nsqlookupd:4160']
}

const topic = 'messages'
const channel = 'consumer'

let count = 0
const reader = new nsq.Reader(topic, channel, options)

reader.on('nsqd_connected', () => {
  log.info('consumer -', green('connected'), `(${watch})`)
})

reader.on('nsqd_closed', () => {
  log.info('consumer -', yellow('disconnected'), `(${watch})`)
  process.exit(0)
})

reader.on('error', error => log.error('consumer -', red('error'), ':', error))

reader.on('message', msg => {
  count++
  log.info('consumer -', blue(`received message #${count}`), ':', msg.body)
  msg.finish()
})

const watch = durations.stopwatch().start()
reader.connect()

