const chalk = require('chalk')
const durations = require('durations')
const nsq = require('nsqjs')
const v1uuid = require('uuid/v1')

const log = require('../../lib/log')
const {blue, green, red, yellow} = require('../../lib/color')

const interval = 1000
const host = 'nsqd'
const port = 4150
const options = {}
const topic = 'messages'

let count = 0
let intervalRef
const writer = new nsq.Writer(host, port, options)

function publish () {
  let index = count++

  const message = {
    index,
    id: v1uuid(),
    timestamp: new Date().toISOString()
  }

  log.info(`producer - sending message ${index}`)

  writer.publish(topic, message, () => {
    log.info('producer -', blue(`message ${index} sent`))
  })
}

writer.on('ready', () => {
  log.info('producer -', green(`connected (${watch})`))
  intervalRef = setInterval(publish, interval)
})

writer.on('closed', () => {
  log.info('producer -', yellow(`disconnected (${watch})`))
})

writer.on('error', error => {
  log.error('producer -', red('error'), ':', error)
})

watch = durations.stopwatch().start()
writer.connect()

