const durations = require('durations')
const { Publisher } = require('squeaky')
const v1uuid = require('uuid/v1')
const { blue, green, red, yellow } = require('@buzuli/color')

const log = require('../../lib/log')

const interval = 1000
const host = 'nsqd'
const port = 4150
const topic = 'messages'
const autoConnect = false

let count = 0
const watch = durations.stopwatch()
const pub = new Publisher({ host, port, autoConnect })

function publish () {
  let index = count++

  const message = {
    index,
    id: v1uuid(),
    timestamp: new Date().toISOString()
  }

  log.info(`producer - sending message ${index}`)

  pub.publish(topic, message, () => {
    log.info('producer -', blue(`message ${index} sent`))
  })
}

pub.on('ready', () => {
  log.info('producer -', green('connected'), `(${watch})`)
  setInterval(publish, interval)
})

pub.on('close', () => {
  log.info('producer -', yellow('disconnected'), `(${watch})`)
})

pub.on('error', error => {
  log.error('producer -', red('error'), ':', error)
})

watch.start()
pub.connect()
