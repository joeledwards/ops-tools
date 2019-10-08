module.exports = {
  command: 'emr-cluster-info <cluster>',
  desc: 'Get details on a single EMR cluster',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('json', {
      type: 'boolean',
      desc: 'print raw JSON data instead of the summary',
      default: false,
      alias: ['j']
    })
}

function handler ({ cluster, json }) {
  const { blue, gray, green, orange, purple, red, yellow } = require('@buzuli/color')
  const durations = require('durations')
  const moment = require('moment')
  const r = require('ramda')

  const emr = require('../lib/aws').emr()

  getClusterInfo(cluster)
    .then(info => {
      const {
        Cluster: {
          Name: name,
          Status: {
            State: state,
            StateChangeReason: {
              Code: reasonCode,
              Message: reasonMessage
            },
            Timeline: {
              CreationDateTime: upTime,
              ReadyDateTime: readyTime,
              EndDateTime: downTime
            }
          },
          Ec2InstanceAttributes: {
            Ec2KeyName: owner,
            Ec2AvailabilityZone: zone
          },
          AutoTerminate: autoTerminate,
          Applications: apps,
          NormalizedInstanceHours: hours
        },
        InstanceGroups: groups
      } = info

      const nodes = name => r.compose(
        r.head,
        r.map(({
          Id: id, InstanceType: type, RequestedInstanceCount: count
        }) => (`[${yellow(id)}] ${green(type)} x ${orange(count)}`)),
        r.filter(({ Name: n }) => n === name)
      )

      const master = nodes('MASTER')(groups) || '--'
      const core = nodes('CORE')(groups) || '--'
      const task = nodes('TASK')(groups) || '--'

      const up = upTime ? upTime.toISOString() : 'n/a'
      const ready = readyTime ? readyTime.toISOString() : 'n/a'
      const down = downTime ? downTime.toISOString() : 'n/a'
      const end = moment.utc(downTime || new Date())
      const age = durations.millis(end.diff(upTime))

      if (json) {
        console.log(JSON.stringify(info, null, 2))
      } else {
        console.log(`Cluster ${yellow(cluster)} (${green(name)})`)
        console.log(`     zone : ${yellow(zone)}`)
        console.log(`    owner : ${green(owner)}`)
        console.log(`    state : ${stateColor(state)} (${reasonColor(reasonCode, reasonMessage)})`)
        console.log(`       up : ${blue(up)}`)
        console.log(`    ready : ${blue(ready)}`)
        console.log(`     down : ${blue(down)}`)
        console.log(`      age : ${blue(age)}`)
        console.log(`    hours : ${orange(hours)}`)
        console.log(`     poof : ${purple(autoTerminate)}`)
        console.log('     apps :', apps)
        console.log(`   master : ${master}`)
        console.log(`     core : ${core}`)
        console.log(`     task : ${task}`)
      }
    })
    .catch(error => {
      console.error(`Error describing cluster ${yellow(cluster)} :`, error)
      process.exit(1)
    })

  async function getClusterInfo (ClusterId) {
    const cluster = await emr.describeCluster({ ClusterId })
    const groups = await emr.listInstanceGroups({ ClusterId })

    return { ...cluster, ...groups }
  }

  function reasonColor (code, message) {
    return (code === 'ALL_STEPS_COMPLETED'
      ? green
      : code === 'USER_REQUEST'
        ? yellow
        : r.startsWith('Running')(message || '')
          ? green
          : red
    )(`${message}`)
  }

  function stateColor (state) {
    return (state === 'RUNNING'
      ? green
      : state === 'TERMINATED_WITH_ERRORS'
        ? red
        : state === 'TERMINATED'
          ? gray
          : yellow
    )(state)
  }
}
