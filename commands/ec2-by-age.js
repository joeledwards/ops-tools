module.exports = {
  command: 'ec2-by-age',
  desc: 'list all AWS instances in a region by age',
  handler
}

function handler () {
  const r = require('ramda')
  const durations = require('durations')
  const moment = require('moment')
  const c = require('@buzuli/color')

  const newEc2 = require('../lib/aws').ec2
  const chart = require('../lib/chart')

  const ec2 = newEc2()
  const region = ec2.aws.region

  ec2.listInstances()
    .then(({ Reservations }) => {
      const now = moment()

      const fieldExtractor = ({
        InstanceId: id,
        InstaceType: type,
        Tags: tags,
        LaunchTime: launchTime,
        State: {
          Name: state
        },
        Hypervisor: hv,
        VirtualizationType: vt
      }) => {
        const name = r.head(r.compose(
          r.map(({ Value }) => Value),
          r.filter(({ Key }) => r.toLower(Key) === 'name')
        )(tags))
        const age = durations.millis(now.diff(moment(launchTime)))
        const created = launchTime.toISOString()

        return { id, name, type, created, age, state, hv, vt }
      }

      const summarizer = ({ id, name, created, age, state, hv, vt }) => {
        const createStr = c.purple(created)
        const ageStr = c.orange(age)
        const idStr = c.yellow(id)
        const vmStr = c.gray(`${hv}:${vt}`)
        const stateStr = (state === 'running') ? c.green(state) : c.red(state)
        const nameStr = c.blue(name)
        return `[${createStr} | ${ageStr}] ${idStr} ${vmStr} [${stateStr}] (${nameStr})`
      }

      const instances = r.map(r.flatten, r.map(({ Instances: is }) => is))(Reservations)
      const translated = r.map(fieldExtractor)(instances)
      const summaries = r.compose(
        r.map(summarizer),
        r.sortBy(({ created, name }) => [created, name])
      )(translated)

      console.info(r.join('\n')(summaries))
      console.info()
      console.info(chart.times({
        times: r.map(({ created }) => created)(translated),
        label: 'Launches',
        height: 10,
        width: 60
      }))
      console.info()
      console.info(`${c.orange(instances.length)} instances from region ${c.blue(region)}`)
    })
    .catch(error => {
      console.error(error)
      console.error(c.red(`Error listing instances by age. Details above ☝🏼`))
      process.exit(1)
    })
}
