const nsq = require('nsqjs')
const {isNil} = require('ramda')
const yargs = require('yargs')
const {blue, green, yellow} = require('@buzuli/color')

const log = require('../lib/log')

const args = yargs.env('NSQ')
  .boolean('ack').default('ack', true)
  .string('auth-secret')
  .string('channel').default('channel', 'buzuli#ephemeral')
  .string('client-id').default('client-id', 'buzuli')
  .number('limit').default('limit', 10)
  .option('lookupd-host', {type: 'array'})
  .option('nsqd-host', {type: 'array'})
  .number('requeue-delay').default('requeue-delay', 100)
  .boolean('tls').default('tls', false)
  .boolean('tls-verify').default('tls-verify', true)
  .string('topic').require('topic')
  .boolean('unlimited').default('unlimited', false)
  .argv

const {
  ack,
  authSecret,
  channel,
  clientId,
  limit,
  lookupdHost,
  nsqdHost,
  requeueDelay,
  tls,
  tlsVerify,
  topic,
  unlimited
} = args

const options = {clientId}

if (tls === true) {
  log.info(`   tls-verify: ${tlsVerify}`)
  options.tls = tls
  options.tlsVerification = tlsVerify !== false
}

if (!isNil(requeueDelay)) {
  log.info(`requeue-delay: ${requeueDelay}`)
  options.requeueDelay = requeueDelay
}

if (!isNil(authSecret)) {
  log.info(`  auth-secret: ***`)
  options.authSecret = authSecret
}

if (!isNil(nsqdHost)) {
  log.info(`   nsqd-hosts: ${nsqdHost}`)
  options.nsqdTCPAddresses = nsqdHost
} else if (!isNil(lookupdHost)) {
  log.info(`lookupd-hosts: ${lookupdHost}`)
  options.lookupdHTTPAddresses = lookupdHost
} else {
  log.error(`You must specify at least one host (--nsqdHost > --lookupdHost).`)
  process.exit(1)
}

const limitStr = unlimited ? '∞' : `${limit}`
const progress = () => `${count}/${limitStr}`

log.info(`        topic: ${topic}`)
log.info(`      channel: ${channel}`)
log.info(`        limit: ${limitStr}`)
log.info(`    client-id: ${clientId}`)
log.info(`          tls: ${tls}`)

let count = 0
let halting = false
const reader = new nsq.Reader(topic, channel, options)

// Schedule halt
function shutdown () {
  if (!halting) {
    const delay = 1000
    const termTime = new Date(new Date().getTime() + delay).toISOString()
    log.info(yellow(`scheduling connection to terminate at`), termTime)
    halting = true
    setTimeout(closer, 1000)
  }
}

function closer () {
  log.info(yellow(`closing connection now`))
  reader.close()
}

function messageHandler (msg) {
  count++
  log.info(msg.json())

  if (ack) {
    log.info(blue(`acknowledging message ${progress()}`))
    msg.finish()
  } else {
    log.info(yellow(`re-queueing message ${progress()}`))
    msg.requeue(requeueDelay)
  }

  if (!unlimited && count >= limit) {
    log.info(yellow(`${progress()} messages received; halting`))
    reader.removeListener('message', messageHandler)
    setTimeout(shutdown)
  }
}

reader.on('nsqd_connected', () => log.info(green('connected')))
reader.on('nsqd_closed', () => log.info(yellow('disconnected')))
reader.on('error', error => log.error('error', ':', error))
reader.on('message', messageHandler)

reader.connect()
