const newEc2 = require('../lib/ec2')
const {compose, filter, flatten, head, join, map, sortBy, toLower} = require('ramda')
const durations = require('durations')
const moment = require('moment')
const {red, blue, orange, purple, yellow, green} = require('@buzuli/color')

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

    const fieldExtractor = ({
        InstanceId: id,
        InstaceType: type,
        Tags: tags,
        LaunchTime: launchTime,
        State: {
          Name: state
        }
    }) => {
        const name = head(compose(
          map(({Value}) => Value),
          filter(({Key}) => toLower(Key) === 'name')
        )(tags))
        const age = durations.millis(now.diff(moment(launchTime)))
        const created = launchTime.toISOString()

        return {id, name, type, created, age, state}
    }

    const summarizer = ({id, name, created, age, state}) => {
      return `[${purple(created)} | ${orange(age)}] ${yellow(id)} [${(state == 'running') ? green(state) : red(state)}] (${blue(name)})`
    }

    const instances = map(flatten, map(({Instances: is}) => is))(Reservations)
    const summaries = compose(
      map(summarizer),
      sortBy(({created, name}) => [created, name]),
      map(fieldExtractor)
    )(instances)

    console.log(join('\n')(summaries))
    console.log(`${orange(instances.length)} instances from region ${blue(region)}`)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
}