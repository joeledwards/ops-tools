const durations = require('durations')
const { Subscriber } = require('squeaky')
const { blue, green, red, yellow } = require('@buzuli/color')

const log = require('../../lib/log')

const topic = 'messages'
const channel = 'consumer'
const lookup = ['nsqd:4150']
const autoConnect = false

let count = 0
const watch = durations.stopwatch()
const sub = new Subscriber({ topic, channel, lookup, autoConnect })

sub.on('ready', () => {
  log.info('consumer -', green('connected'), `(${watch})`)
})

sub.on('close', () => {
  log.info('consumer -', yellow('disconnected'), `(${watch})`)
  process.exit(0)
})

sub.on('error', error => {
  log.error('consumer -', red('error'), ':', error)
  process.exit(1)
})

sub.on('message', msg => {
  count++
  try {
    log.info('consumer -', blue(`received message #${count}`), ':', msg.json())
  } catch (error) {
    log.error('consumer -', red(`error parsing message #${count}`), ':', msg.data)
  }
  msg.finish()
})

watch.start()
sub.connect()
