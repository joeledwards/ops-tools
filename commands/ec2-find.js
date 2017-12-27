const chalk = require('chalk')
const ec2 = require('../lib/ec2')()

const {
  compose, filter, head, map, path, pathEq, values
} = require('ramda')

const {red, yellow, green} = chalk

const findName = instance => {
  return compose(
    head,
    map(path(['Value'])),
    filter(pathEq(['Key'], 'Name'))
  )(instance.Tags)
}

ec2.findInstances({
  //instanceFilter: instance => true,
  instanceFilter: instance => {
    return compose(
      head,
      match(/frontdoor-19/),
      path(['Value']),
      pathEq(['Key'], 'Name'),
    )(instance.Tags)
  },
  fieldExtractor: instance => {
    const {
      InstanceId: id,
      KeyName: sshKey,
      PrivateIpAddress: privateIp,
      PublicIpAddress: publicIp
    } = instance

    return {
      id, sshKey, name: findName(instance),
      network: {
        privateIp, publicIp
      }
    }
  }
})
.then(instances => {
  const count = instances.length
  console.log('Showing first instance')
  console.log(head(instances))
  console.log(green(
    `Listed ${count} instances for region ${yellow(ec2.aws.region)}`
  ))
})
.catch(error => {
  console.error(error)
  console.error(red(
    `Error finding instances in ${yellow(ec2.aws.region)}: details above`
  ))
  process.exit(1)
})

