module.exports = {
  command: 'ec2-find',
  desc: 'find an EC2 instance',
  builder,
  handler
}

function builder (yargs) {
  yargs
  .option('quiet', {
    type: 'boolean',
    desc: 'only output server list (JSON)',
    default: false,
    alias: ['q']
  })
  .option('id', {
    type: 'string',
    desc: 'id search regex',
    default: false,
    alias: ['i']
  })
  .option('key', {
    type: 'string',
    desc: 'ssh key search regex',
    default: false,
    alias: ['k']
  })
  .option('name', {
    type: 'string',
    desc: 'name search regex',
    default: false,
    alias: ['n']
  })
}

function handler ({id, key, name, quiet}) {
  const {green, orange, red, yellow} = require('@buzuli/color')
  const json = require('@buzuli/json')
  const r = require('ramda')

  const ec2 = require('../lib/aws').ec2()

  function makeRegFilter (expression) {
    const regex = expression ? new RegExp(expression) : undefined
    return v => regex ? (v && v.match(regex)) : true
  }

  const idFilter = makeRegFilter(id)
  const keyFilter = makeRegFilter(key)
  const nameFilter = makeRegFilter(name)

  function instanceFilter (instance) {
    const {id, sshKey, name} = fieldExtractor(instance)

    return idFilter(id) && keyFilter(sshKey) && nameFilter(name)
  }

  function fieldExtractor (instance) {
    const {
      InstanceId: id,
      KeyName: sshKey,
      PrivateIpAddress: privateIp,
      PublicIpAddress: publicIp
    } = instance

    return {
      id,
      sshKey,
      name: findName(instance),
      network: {
        privateIp, publicIp
      }
    }
  }

  function findName (instance) {
    return r.compose(
      r.head,
      r.map(r.path(['Value'])),
      r.filter(r.pathEq(['Key'], 'Name')),
    )(instance.Tags || [])
  }

  ec2.findInstances({
    instanceFilter,
    fieldExtractor
  })
  .then(instances => {
    const count = instances.length
    if (quiet) {
      console.log(JSON.stringify(instances))
    } else {
      console.log(json(instances))
      console.log(green(
        `Listed ${orange(count)} instances for region ${yellow(ec2.aws.region)}`
      ))
    }
  })
  .catch(error => {
    console.error(error)
    console.error(red(
      `Error finding instances in ${yellow(ec2.aws.region)}: details above`
    ))
    process.exit(1)
  })
}
