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
      alias: ['id']
    })
    .option('name', {
      type: 'string',
      desc: 'name search regex (value of the Name tag)',
      alias: ['n']
    })
    .option('private-ip', {
      type: 'string',
      desc: 'private IP regex',
      alias: ['i']
    })
    .option('public-ip', {
      type: 'string',
      desc: 'public IP regex',
      alias: ['I']
    })
    .option('ssh-key', {
      type: 'string',
      desc: 'ssh key search regex',
      alias: ['key', 'k']
    })
    .option('tag-key', {
      type: 'string',
      desc: 'tag key search regex',
      alias: ['t']
    })
    .option('tag-value', {
      type: 'string',
      desc: 'tag value search regex',
      alias: ['T']
    })
}

function handler ({id, sshKey, name, privateIp, publicIp, tagKey, tagValue, quiet}) {
  const {green, orange, red, yellow} = require('@buzuli/color')
  const json = require('@buzuli/json')
  const r = require('ramda')

  const ec2 = require('../lib/aws').ec2()

  function makeRegFilter (expression) {
    const regex = expression ? new RegExp(expression) : undefined
    return v => regex ? (v && v.match(regex)) : true
  }

  function makeTagFilter (extractor, filter) {
    return tags => {
      if (!tags) {
        return true
      }
      if (!filter) {
        return true
      }
      return r.compose(
        r.head,
        r.map(n => true),
        r.filter(filter),
        r.filter(r.complement(r.isNil)),
        r.map(extractor)
      )(tags)
    }
  }

  const idFilter = makeRegFilter(id)
  const keyFilter = makeRegFilter(sshKey)
  const nameFilter = makeRegFilter(name)
  const privateIpFilter = makeRegFilter(privateIp)
  const publicIpFilter = makeRegFilter(publicIp)
  const tagKeyFilter = makeTagFilter(t => t.Key, makeRegFilter(tagKey))
  const tagValueFilter = makeTagFilter(t => t.Value, makeRegFilter(tagValue))

  function instanceFilter (instance) {
    const {
      id,
      name,
      sshKey,
      tags,
      network: {
        privateIp,
        publicIp
      } = {}
    } = fieldExtractor(instance)

    return idFilter(id) &&
      keyFilter(sshKey) &&
      nameFilter(name) &&
      privateIpFilter(privateIp) &&
      publicIpFilter(publicIp) &&
      tagKeyFilter(tags) &&
      tagValueFilter(tags)
  }

  function fieldExtractor (instance) {
    const {
      InstanceId: id,
      KeyName: sshKey,
      PrivateIpAddress: privateIp,
      PublicIpAddress: publicIp,
      Tags: tags = []
    } = instance

    return {
      id,
      sshKey,
      name: findName(instance),
      tags,
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
