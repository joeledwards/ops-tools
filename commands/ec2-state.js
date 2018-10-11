module.exports = {
  command: 'ec2-state <instance>',
  desc: 'Check or alter the state of an EC2 instance',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .positional('instance', {
      type: 'string',
      desc: 'the ID of the instance whose state should be displayed/altered'
    })
    .option('start', {
      type: 'boolean',
      desc: 'starts the instance if it is not running',
    })
    .option('stop', {
      type: 'boolean',
      desc: 'stops the instance if it is running',
      conflicts: ['start']
    })
    .option('terminate', {
      type: 'boolean',
      desc: 'terminates the instance if it exists',
      conflicts: ['start', 'stop']
    })
}

function handler ({ instance, start, stop, terminate }) {
  const ec2 = require('../lib/aws').ec2()
  const c = require('@buzuli/color')
  const r = require('ramda')
  const readline = require('readline')

  const transitionRequested = start || stop || terminate
  const transitionName = start ? 'start' : stop ? 'stop' : terminate ? 'terminate' : 'ignore'

  const awsOptions = {
    InstanceIds: [
      instance
    ]
  }

  function findName (instance) {
    return r.compose(
      r.head,
      r.map(r.path(['Value'])),
      r.filter(r.pathEq(['Key'], 'Name'))
    )(instance.Tags || [])
  }

  function fieldExtractor (instance) {
    const {
      InstanceId: id,
      State: {
        Name: state
      }

    } = instance

    const name = findName(instance)

    return {
      id,
      name,
      state
    }
  }

  function stateColor (state) {
    switch (state) {
      case 'running':
        return c.green(state)
      case 'pending':
      case 'stopped':
        return c.yellow(state)
      default:
        return c.red(state)
    }
  }

  function idColor (id) {
    return c.yellow(id)
  }

  function nameColor (name) {
    return c.orange(name)
  }

  function regionColor (region) {
    return c.green(region)
  }

  function canTransition (state) {
    if (state === 'running')
      return stop || terminate
    if (state === 'stopped')
      return start || terminate
    if (state === 'pending')
      return terminate
    return false
  }

  async function ask (question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => rl.question(question, answer => {
      rl.close()
      resolve(answer)
    }))
  }

  async function confirmation (question) {
    while (true) {
      let answer = await ask(question)
      switch (answer) {
        case 'yes': return true
        case 'no': return false
        default:
          console.info('Please type either "yes" or "no"')
          answer = null
      }
    }
  }

  async function transitionInstance ({id, name, state}) {
    if (terminate) {
      try {
        await ec2.terminateInstances({ InstanceIds: [id] })
        console.info(`Terminating ${idColor(id)}`)
      } catch (error) {
        console.error(`Error terminating instance ${idColor(id)}`)
      }
    } else if (stop) {
      try {
        await ec2.stopInstances({ InstanceIds: [id] })
        console.info(`Stopping ${idColor(id)}`)
      } catch (error) {
        console.error(`Error stopping instance ${idColor(id)}`)
      }
    } else if (start) {
      try {
        await ec2.startInstances({ InstanceIds: [id] })
        console.info(`Starting ${idColor(id)}`)
      } catch (error) {
        console.error(`Error stopping instance ${idColor(id)}`)
      }
    }
  }

  ec2.findInstances({ awsOptions, fieldExtractor })
    .then(async instances => {
      for (let {id, name, state} of instances) {
        try {
          console.log(`${idColor(id)} (${nameColor(name)}) : ${stateColor(state)}`)
          if (transitionRequested) {
            if (canTransition(state)) {
              if (await confirmation(`Are you sure you wish to ${transitionName} the instance? `)) {
                await transitionInstance({id, name, state})
              }
            } else {
              console.warn(`  Cannot ${transitionName} ${stateColor(state)} instance.`)
            }
          }
        } catch (error) {
          console.error(error)
          throw error
        }
      }
    })
    .catch(error => {
      if (error.code === 'InvalidInstanceID.NotFound') {
        console.info(`Instance ${idColor(instance)} not found in region ${regionColor(ec2.aws.region)}`)
      } else if (error.code === 'InvalidInstanceID.Malformed') {
        console.info(`Invalid instance ID: ${idColor(instance)}`)
      } else {
        console.error(error)
        console.error(c.red(c.emoji.inject(
          `Error finding instances in ${regionColor(ec2.aws.region)}: details above :point_up:`
        )))
      }
      process.exit(1)
    })
}
