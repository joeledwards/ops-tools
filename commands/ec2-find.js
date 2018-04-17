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
    .option('instance-id', {
      type: 'string',
      desc: 'id search regex',
      default: false,
      alias: ['id', 'i']
    })
    .option('name', {
      type: 'string',
      desc: 'name search regex (value of the Name tag)',
      default: false,
      alias: ['n']
    })
    .option('ssh-key', {
      type: 'string',
      desc: 'ssh key search regex',
      default: false,
      alias: ['key', 'k']
    })
    .option('tag-key', {
      type: 'string',
      desc: 'tag key search regex',
      default: false,
      alias: ['t']
    })
    .option('tag-value', {
      type: 'string',
      desc: 'tag value search regex',
      default: false,
      alias: ['T']
    })
}

function handler ({id, key, name, tagKey, tagValue, quiet}) {
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
  const tagKeyFilter = makeRegFilter(tagKey)
  const tagValueFilter = makeRegFilter(tagValue)

  function instanceFilter (instance) {
    const {id, sshKey, name, tags} = fieldExtractor(instance)

    return idFilter(id)
      && keyFilter(sshKey)
      && nameFilter(name)
      && r.compose(
        r.head,
        r.map(n => true),
        r.filter(tagKeyFilter),
        r.map(t => t.Key)
      )(tags)
      && r.compose(
        r.head,
        r.map(v => true),
        r.filter(tagValueFilter),
        r.map(t => t.Value)
      )(tags)
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
      tags: instance.Tags || [],
      network: {
        privateIp, publicIp
      }
    }
  }

  function findName (instance) {
    return r.compose(
      r.head,
      r.map(r.path(['Value'])),
      r.filter(r.pathEq(['Key'], 'Name'))
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
