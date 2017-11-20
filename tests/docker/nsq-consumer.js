const chalk = require('chalk')
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

reader.on('nsqd_connected', () => log('consumer -', green('connected')))

reader.on('nsqd_closed', () => {
  log('consumer -', yellow('disconnected'))
  process.exit(0)
})

reader.on('error', error => log('consumer -', red('error'), ':', error))

reader.on('message', msg => {
  count++
  log('consumer -', blue(`received message #${count}`), ':', msg.body)
  msg.finish()
})

reader.connect()

