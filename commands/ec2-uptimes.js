module.exports = {
  command: 'ec2-uptimes',
  desc: 'list AWS instances in a region by uptime',
  handler
}

function handler () {
  const async = require('async')
  const {
    red, blue, orange, yellow, green
  } = require('@buzuli/color')
  const durations = require('durations')
  const moment = require('moment')
  const SSH = require('node-ssh')
  const path = require('path')
  const r = require('ramda')
  const read = require('read')

  const newEc2 = require('../lib/aws').ec2

  const ec2 = newEc2()
  const region = ec2.aws.region

  let passphrase

  passphrasePrompt()
    .then(pass => {
      passphrase = pass
      return ec2.listInstances()
    })
    .then(({ Reservations }) => {
      const fieldExtractor = ({
        InstanceId: id,
        InstanceType: type,
        Tags: tags,
        PublicIpAddress: ip,
        State: {
          Name: state
        }
      }) => {
        const name = r.head(r.compose(
          r.map(({ Value }) => Value),
          r.filter(({ Key }) => r.toLower(Key) === 'name')
        )(tags))

        return { id, name, type, state, ip }
      }

      const summarizer = ({ id, name, type, uptime, state }) => {
        const ut = (uptime === null) ? 'unknown' : durations.millis(uptime)
        return `[${orange(ut)}] ${green(region)} ${yellow(id)} [${(state === 'running') ? green(state) : red(state)}] (${blue(name)})`
      }

      const instances = r.compose(
        r.flatten,
        r.map(({ Instances }) => Instances)
      )(Reservations)

      const results = []
      const uptimeTasks = r.compose(
        r.map(info => {
          return next => {
            return checkUptime({ id: info.id, name: info.name, host: info.ip, passphrase })
              .then(uptime => ({ ...info, uptime }))
              .then(r => results.push(r))
              .then(() => next(), next)
          }
        }),
        r.map(fieldExtractor)
      )(instances)

      async.series(uptimeTasks, error => {
        if (error) {
          console.error(`Error checking uptimes:`, error)
        } else {
          const summaries = r.compose(
            r.reverse,
            r.map(summarizer),
            r.sortBy(({ uptime }) => uptime)
          )(results)

          console.log(r.join('\n')(summaries))
          console.log(`Checked uptime for ${orange(instances.length)} instances in ${blue(region)}`)
        }
      })
    })
    .catch(error => {
      console.error(error)
      process.exit(1)
    })

  async function checkUptime ({
    id,
    name,
    host,
    username = 'ubuntu',
    privateKey = path.resolve(process.env.HOME, '.ssh', 'id_rsa'),
    passphrase
  }) {
    try {
      console.log(`Checking uptime of ${yellow(id)} (${blue(name)})`)
      const ssh = new SSH()
      await ssh.connect({ host, username, privateKey, passphrase })
      const { stdout: uptimeString } = await ssh.execCommand('uptime -s')
      const bootTime = moment.utc(uptimeString)
      const now = moment.utc()
      const uptime = now.diff(bootTime)
      ssh.dispose()
      console.log(`Instance ${yellow(id)} has been up since ${orange(bootTime.toISOString())}`)
      return uptime
    } catch (error) {
      console.error(`Error fetching uptime of ${blue(host)} (${yellow(id)})`, error)
      return null
    }
  }

  function passphrasePrompt () {
    return new Promise((resolve, reject) => {
      read({
        prompt: 'Passphrase for SSH key: ',
        silent: true
      }, (error, value) => {
        if (error) {
          reject(error)
        } else {
          resolve(value)
        }
      })
    })
  }
}
