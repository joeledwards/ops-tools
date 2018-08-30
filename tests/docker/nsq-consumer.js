const durations = require('durations')
const nsq = require('nsqjs')
const { blue, green, red, yellow } = require('@buzuli/color')

const log = require('../../lib/log')

const options = {
  nsqdTCPAddresses: ['nsqd:4150']
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

reader.on('error', error => {
  log.error('consumer -', red('error'), ':', error)
  process.exit(1)
})

reader.on('message', msg => {
  count++
  try {
    log.info('consumer -', blue(`received message #${count}`), ':', msg.json())
  } catch (error) {
    log.error('consumer -', red(`error parsing message #${count}`), ':', msg.data)
  }
  msg.finish()
})

const watch = durations.stopwatch().start()
reader.connect()
