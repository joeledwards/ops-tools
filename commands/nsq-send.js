module.exports = {
  command: 'nsq-send <topic> <message>',
  desc: 'send a message to an NSQ topic',
  builder,
  handler
}

function builder (yargs) {
  yargs
  .option('host', {
    type: 'string',
    desc: 'the host on which NSQ is running',
    default: 'localhost',
    alias: ['h']
  })
  .option('port', {
    type: 'number',
    desc: 'the port on which NSQ is listening',
    default: 4150,
    alias: ['p']
  })
}

function handler ({host, port, topic, message}) {
  const nsqjs = require('nsqjs')
  const {blue, green, orange, red, yellow, emoji} = require('@buzuli/color')

  const options = {}
  const nsq = new nsqjs.Writer(host, port, options)

  console.info('connecting...')

  nsq.on('close', () => console.info('Connection closed'))
  nsq.on('error', error => console.error('Error:', error))
  nsq.once('ready', () => {
    console.log('sending message...')
    nsq.publish(topic, message, error => {
      if (error) {
        console.log(error)
        console.error(red(
          `Error sending message to topic '${yellow(topic)}' on ${blue(host)}:${orange(port)}` +
          emoji.inject(' : Details above :point_up:'))
        )
      } else {
        console.info(green(`Successfully sent message to topic '${yellow(topic)}' on ${blue(host)}:${orange(port)}`))
      }

      nsq.close()
    })
  })

  nsq.connect()
}
