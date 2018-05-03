module.exports = {
  command: 'ec2-limits',
  desc: 'EC2 limits applied for this account',
  handler
}

function handler () {
  const {red, emoji} = require('@buzuli/color')
  const buzJson = require('@buzuli/json')
  const r = require('ramda')

  const ec2 = require('../lib/aws').ec2()

  const params = {
    AttributeNames: [
      'max-instances',
      'vpc-max-security-groups-per-interface',
      'max-elastic-ips',
      'vpc-max-elastic-ips'
    ]
  }

  ec2.describeAccountAttributes(params)
    .then(({AccountAttributes: attributes}) => {
      console.log(buzJson(
        r.compose(
          r.fromPairs,
          r.map(({name, value}) => [name, value]),
          r.sortBy(({name}) => name),
          r.map(({
            AttributeName: name, AttributeValues: [{AttributeValue: value} = {}] = []
          }) => ({name, value: parseInt(value)}))
        )(attributes)
      ))
    })
    .catch(error => {
      console.error(error)
      console.error(red(
        emoji.inject('Error describing account attributes. Details above :point_up:')
      ))
      process.exit(1)
    })
}
