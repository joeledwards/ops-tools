module.exports = {
  command: 'ec2-new-docker-swarm',
  desc: 'create a docker swarm cluster',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .options('manager-type', {
      type: 'string',
      desc: 'aws instance type for manager nodes',
      default: 'm4.large',
      alias: ['t']
    })
    .options('swarm-alias', {
      type: 'string',
      desc: 'alias to assign this cluster for easier recognition',
      alias: ['a', 'alias']
    })
    .option('worker-count', {
      type: 'number',
      desc: 'number of worker nodes',
      default: 0,
      alias: ['c']
    })
    .options('worker-type', {
      type: 'string',
      desc: 'aws instance type for worker nodes',
      default: 'm4.large',
      alias: ['T']
    })
    .options('simulate', {
      tpe: 'boolean',
      desc: 'simulate the swarm setup without provisioning any resources',
      default: false,
      alias: ['s']
    })
}

function handler ({
  managerType,
  swarmAlias,
  workerCount,
  workerType
}) {
  require('log-a-log')()

  const {
    orange,
    red,
    yellow,
    emoji
  } = require('@buzuli/color')
  const r = require('ramda')
  const P = require('bluebird')
  const uuid = require('uuid/v4')
  const ec2 = require('../lib/aws').ec2()
  const random = require('../lib/random')

  async function run () {
    try {
      const { swarmId } = spawnSwarm()
      console.log(`Successfully launched swarm ${yellow(swarmId)} `)
    } catch (error) {
      console.error(error)
      console.error(red(emoji.inject(
        'Error launching swarm. Details above :point-up:'
      )))
    }
  }

  async function spawnSwarm () {
    const zones = await ec2.listZones()
    const swarmId = uuid()
    const { primaryInfo: { token, ip } } = await launchManagers({ swarmId, zones })

    console.info(`All managers launched.`)

    if (workerCount < 1) {
      console.log(`No workers requested.`)
    } else {
      await launchWorkers({ primaryIp: ip, token, zones })
      console.log(`All ${orange(workerCount)} workers attached.`)
    }

    return {
      swarmId
    }
  }

  async function launchManagers ({ swarmId, zones }) {
    // Split managers evenly between zones (regions too when relevant)

    return P.reduce(
      r.take(3)(zones),
      async (primaryInfo, az) => {
        const managerOptions = { az, primaryInfo, swarmId }
        const { ip, token } = await launchManager(managerOptions)
        const {
          ip: primaryIp,
          token: primaryToken,
          clusterIps
        } = primaryInfo || {}

        // use info from primary if populated; otherwise this is the primary
        return {
          ip: primaryIp || ip,
          token: primaryToken || token,
          clusterIps: clusterIps ? [ip, ...clusterIps] : [ip],
          primaryInfo
        }
      }
    )
  }

  let lastOctet = 2
  async function launchManager ({ az, primaryInfo, swarmId }) {
    console.info(`Launching${primaryInfo ? ' primary' : ''} swarm ${yellow(swarmId)} manager in zone ${yellow(az)}`)

    // Always fetch the manager's IP and ID after launch
    const ip = `10.10.10.${lastOctet++}`
    const id = await random.hex(16)

    let token
    if (primaryInfo) {
      // If this is not the primary, connect to the primary
      console.info(`Attaching manager to primary...`)
      token = primaryInfo.token
    } else {
      // Otherwise fetch the primary's token
      console.info(`Fetching token from primary...`)
      token = await random.hex(32)
    }

    return { id, ip, token }
  }

  async function launchWorkers ({ primaryIp, token, zones }) {
    // Split workers evenly between zones (regions too when relevant)

    P.reduce(
      zones,
      (acc, az) => launchWorker({ az, primaryIp, token })
    )
  }

  async function launchWorker ({ az, primaryIp, token }) {
    instanceOptions()
    console.log(`Launching worker in zone ${yellow(az)}...`)

    const id = await random.hex(16)

    console.log(`Launched worker ${yellow(id)}`)
  }

  function zoneImage (az) {
    return 'ami-deadbeef'
  }

  function instanceOptions ({ az, type, sshKey, launchScript = '' }) {
    return {
      AdditionalInfo: launchScript,
      ImageId: zoneImage(az),
      InstanceType: type,
      KeyName: sshKey,
      MinCount: 1,
      MaxCount: 1,
      Placement: {
        AvailabilityZone: az
      }
    }
  }

  run()
}
