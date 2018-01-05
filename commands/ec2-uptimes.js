const async = require('async')
const {red, blue, orange, purple, yellow, green} = require('@buzuli/color')
const durations = require('durations')
const moment = require('moment')
const SSH = require('node-ssh')
const path = require('path')
const {compose, filter, flatten, head, join, map, sortBy, toLower} = require('ramda')
const read = require('read')

const newEc2 = require('../lib/ec2')

const ec2 = newEc2()
const region = ec2.aws.region

async function checkUptime ({
  host,
  username = 'ubuntu',
  privateKey = path.resolve(process.env.HOME, '.ssh', 'id_rsa'),
  passphrase
}) {
  console.log(`Checking ${host}`)
  const ssh = new SSH()
  await ssh.connect({host, username, privateKey, passphrase})
  const bootTime = moment(await ssh.execCommand('uptime -s'))
  const now = moment()
  const uptime = now.diff(bootTime)
  ssh.dispose()
  return uptime
}

module.exports = {
  command: 'ec2-uptimes',
  desc: 'list AWS instances in a region by uptime',
  handler
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

function handler () {
  let passphrase

  passphrasePrompt()
  .then(pass => {
    passphrase = pass
    return ec2.listInstances()
  })
  .then(({Reservations}) => {
    const fieldExtractor = ({
      InstanceId: id,
      InstaceType: type,
      Tags: tags,
      PublicIpAddress: ip,
      State: {
        Name: state
      }
    }) => {
      const name = head(compose(
        map(({Value}) => Value),
        filter(({Key}) => toLower(Key) === 'name')
      )(tags))

      return {id, name, type, state, ip}
    }

    const summarizer = ({id, name, type, uptime, state}) => {
      const ut = durations.millis(uptime)
      return `[${orange(ut)}] ${green(region)} ${yellow(id)} [${(state == 'running') ? green(state) : red(state)}] (${blue(name)})`
    }

    const instances = compose(
      flatten,
      map(({Instances}) => Instances)
    )(Reservations)

    const results = []
    const uptimeTasks = compose(
      map(info => {
        return next => {
          return checkUptime({host: info.ip, passphrase})
            .then(({uptime}) => ({...info, uptime}))
            .then(r => results.push(r))
            .then(() => next(), next)
        }
      }),
      map(fieldExtractor)
    )(instances)

    async.series(uptimeTasks, error => {
      if (error) {
        console.error(`Error checking uptimes:`, error)
      } else {
        console.log(`results:`, results)
        console.log(`wrapped up all ${uptimeTasks.length} tasks`)

        const summaries = compose(
          map(summarizer),
          sortBy(({uptime}) => uptime),
        )(instances)

        console.log(join('\n')(summaries))
        console.log(`${orange(instances.length)} instances from region ${blue(region)}`)
      }
    })
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
}
