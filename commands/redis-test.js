module.exports = {
  command: 'redis-test',
  desc: 'test a redis server',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('host', {
      type: 'string',
      desc: 'the host where redis server is running',
      default: 'localhost',
      alias: 'h'
    })
    .option('port', {
      type: 'number',
      desc: 'the port on which the redis serer is listening',
      default: 6379,
      alias: 'p'
    })
}

async function handler (options) {
  try {
    await redisTest(options)
  } catch (error) {
    console.error('Fatal:', error)
    process.exit(1)
  }
}

async function redisTest ({
  host,
  port
}) {
  const c = require('@buzuli/color')
  const Redis = require('ioredis')
  const { stopwatch } = require('durations')

  const redis = new Redis({ host, port })

  console.info(`Testing redis server ${c.blue(host)}:${c.orange(port)}`)

  await testInfo({ redis })
  await testString({ redis })
  await testHash({ redis })
  await testPubSub({ redis, host, port })

  closeClient(redis)

  async function testInfo ({ redis }) {
    const watch = stopwatch().start()
    await redis.info()
    watch.stop()
    console.info(`Fetched info (warm-up) in ${c.blue(watch)}`)
  }

  async function testString ({ redis }) {
    const watch = stopwatch().start()
    await redis.set('foo', 'bar')
    await redis.get('foo')
    await redis.del('foo')
    watch.stop()
    console.info(`Completed string set/get in ${c.blue(watch)}`)
  }

  async function testHash ({ redis }) {
    const watch = stopwatch().start()
    await redis.hset('foo', 'bar', 'baz')
    await redis.hget('foo', 'bar')
    await redis.del('foo')
    watch.stop()
    console.info(`Completed hash hset/hget in ${c.blue(watch)}`)
  }

  async function testPubSub ({ redis: pub, host, port }) {
    const sub = new Redis({ host, port })

    const watch = stopwatch().start()
    await sub.subscribe('notices')

    const d = defer()
    sub.on('message', (channel, message) => {
      d.resolve({ channel, message })
    })
    await redis.publish('notices', 'hi')
    await d.promise
    await sub.unsubscribe('notices')

    watch.stop()
    console.info(`Completed pub/sub delivery in ${c.blue(watch)}`)

    closeClient(sub)
  }

  function defer () {
    const d = {}

    const promise = new Promise((resolve, reject) => {
      d.resolve = resolve
      d.reject = reject
    })

    d.promise = promise

    return d
  }

  function closeClient (redis) {
    redis.disconnect()
    redis.removeAllListeners()
  }
}
