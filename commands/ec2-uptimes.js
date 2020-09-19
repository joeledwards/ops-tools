module.exports = {
  command: 'ec2-uptimes',
  desc: 'list AWS instances in a region by uptime',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('key', {
      type: 'string',
      desc: 'the SSH key to use for authenticating with hosts',
      alias: 'k'
    })
    .option('name', {
      type: 'string',
      desc: 'filter the instances to those names matching this pattern (regex)',
      alias: 'n'
    })
    .option('username', {
      type: 'string',
      desc: 'the username to use for host logins',
      alias: 'u',
      default: 'ec2-user'
    })
}

async function handler (options) {
  try {
    await uptimes(options)
  } catch (error) {
    console.error('Error scanning EC2 instance uptimes:', error)
    process.exit(1)
  }
}

async function uptimes (options) {
  const {
    key,
    name: nameFilter,
    username
  } = options

  const c = require('@buzuli/color')
  const durations = require('durations')
  const moment = require('moment')
  const SSH = require('node-ssh')
  const path = require('path')
  const r = require('ramda')
  const read = require('read')

  const nameRegex = (nameFilter != null) ? new RegExp(nameFilter) : undefined
  const newEc2 = require('../lib/aws').ec2

  const ec2 = newEc2()
  const region = ec2.aws.region

  const passphrase = await passphrasePrompt()
  const { Reservations: reservations } = await ec2.listInstances()

  const instances = r.compose(
    r.map(({ id, name, ip: host, state }) => ({ id, name, host, state, username, passphrase })),
    r.filter(({ name }) => nameRegex == null || (name && name.match(nameRegex))),
    r.map(fieldExtractor),
    r.flatten,
    r.map(({ Instances: instances }) => instances)
  )(reservations)

  console.info(`Identified ${c.orange(instances.length)} matching instances`)
  console.info({ instances })

  const results = []
  for (const instance of instances) {
    const uptime = await checkUptime(instance)
    results.push({ ...instance, uptime })
  }

  const summaries = r.compose(
    r.reverse,
    r.map(summarizer),
    r.sortBy(({ uptime }) => uptime)
  )(results)

  console.log(r.join('\n')(summaries))
  console.log(`Checked uptime for ${c.orange(instances.length)} instances in ${c.blue(region)}`)

  // === helper functions ======

  function fieldExtractor ({
    InstanceId: id,
    InstanceType: type,
    Tags: tags,
    PrivateIpAddress: ip,
    State: {
      Name: state
    }
  }) {
    const name = r.head(r.compose(
      r.map(({ Value }) => Value),
      r.filter(({ Key }) => r.toLower(Key) === 'name')
    )(tags))

    return { id, name, type, state, ip }
  }

  function summarizer ({ id, name, type, uptime, state }) {
    const ut = (uptime == null) ? 'unknown' : durations.millis(uptime)
    return `[${c.orange(ut)}] ${c.green(region)} ${c.yellow(id)} [${(state === 'running') ? c.green(state) : c.red(state)}] (${c.blue(name)})`
  }

  async function checkUptime ({
    id,
    name,
    host,
    username,
    privateKey = key
      ? path.resolve(key)
      : path.resolve(process.env.HOME, '.ssh', 'id_rsa'),
    passphrase
  }) {
    try {
      console.log(`Checking uptime of ${c.yellow(id)} (${c.blue(name)})`)
      const ssh = new SSH()
      await ssh.connect({ host, username, privateKey, passphrase })
      const { stdout: uptimeString } = await ssh.execCommand('uptime -s')
      const bootTime = moment.utc(uptimeString)
      const now = moment.utc()
      const uptime = now.diff(bootTime)
      ssh.dispose()
      console.log(`Instance ${c.yellow(id)} has been up since ${c.orange(bootTime.toISOString())}`)
      return uptime
    } catch (error) {
      console.error(`Error fetching uptime of ${c.blue(host)} (${c.yellow(id)})`, error)
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
