module.exports = {
  command: 'ec2-state <instance>',
  desc: 'Check or alter the state of an EC2 instance',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('restart', {
      type: 'boolean',
      default: undefined,
      desc: 'stops the instance if it is running'
    })
    .option('start', {
      type: 'boolean',
      default: undefined,
      desc: 'starts the instance if it is not running',
      conflicts: ['restart']
    })
    .option('stop', {
      type: 'boolean',
      default: undefined,
      desc: 'stops the instance if it is running',
      conflicts: ['restart', 'start']
    })
    .option('terminate', {
      type: 'boolean',
      default: undefined,
      desc: 'terminates the instance if it exists',
      conflicts: ['restart', 'start', 'stop']
    })
}

function handler ({instance, restart, start, stop, terminate}) {
  const ec2 = require('../lib/aws').ec2()
  const c = require('@buzuli/color')
  const r = require('ramda')

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

  ec2.findInstances({awsOptions, fieldExtractor})
    .then(instances => {
      instances.forEach(({id, name, state}) => {
        console.log(`${c.yellow(id)} (${c.blue(name)}) : ${stateColor(state)}`)
      })
    })
    .catch(error => {
      console.error(error)
      console.error(c.red(c.emoji.inject(
        `Error finding instances in ${c.yellow(ec2.aws.region)}: details above :point_up:`
      )))
      process.exit(1)
    })
}
