const newEc2 = require('../lib/ec2')
const {compose, filter, flatten, head, join, map, sortBy, toLower} = require('ramda')
const durations = require('durations')
const moment = require('moment')
const {blue, orange, purple, yellow, green} = require('@buzuli/color')

const ec2 = newEc2()
const region = ec2.aws.region

module.exports = {
  command: 'ec2-by-age',
  desc: 'list all AWS instances in a region by age',
  handler
}

function handler () {
  ec2.listInstances()
  .then(({Reservations}) => {
    const now = moment()
    console.log(join('\n')(compose(
      map(
        ({id, name, created, age}) => {
          return `[${purple(created)} | ${orange(age)}] ${green(region)} ${yellow(id)} (${blue(name)})`
        }
      ),
      sortBy(({created, name}) => [created, name]),
      map(({
        InstanceId: id,
        InstaceType: type,
        Tags: tags,
        LaunchTime: launchTime
      }) => {
        const name = head(compose(
          map(({Value}) => Value),
          filter(({Key}) => toLower(Key) === 'name')
        )(tags))
        const age = durations.millis(now.diff(moment(launchTime)))
        const created = launchTime.toISOString()

        return {id, name, type, created, age}
      }),
      flatten,
      map(({Instances}) => Instances)
    )(Reservations)))
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
}
