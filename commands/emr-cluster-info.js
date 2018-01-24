module.exports = {
  command: 'emr-cluster-info <cluster-id>',
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

function handler ({clusterId: id, json}) {
  const {blue, emoji, green, orange, red, yellow} = require('@buzuli/color')
  const durations = require('durations')
  const moment = require('moment')
  const r = require('ramda')

  const emr = require('../lib/aws').emr()
  const region = emr.aws.region

  getClusterInfo(id)
  .then(info => {
    const {
      Cluster: {
        Name: name,
        Status: {
          State: state,
          StateChangeReason: {
            Code: stateReason
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

    const master = r.compose(
      r.head,
      r.map(({
        Id: id, InstanceType: type, RequestedInstanceCount: count
      }) => ({id, type, count})),
      r.filter(({Name: n}) => n === 'MASTER')
    )(groups)

    const core = r.compose(
      r.head,
      r.map(({
        Id: id, InstanceType: type, RequestedInstanceCount: count
      }) => ({id, type, count})),
      r.filter(({Name: n}) => n === 'CORE')
    )(groups)

    const up = upTime ? upTime.toISOString() : 'n/a'
    const ready = readyTime ? readyTime.toISOString() : 'n/a'
    const down = downTime ? downTime.toISOString() : 'n/a'
    const end = moment(downTime || new Date())
    const age = durations.millis(end.diff(upTime))

    if (json) {
      console.log(JSON.stringify(info, null, 2))
    } else {
      console.log(`Cluster ${yellow(id)} (${green(name)})`)
      console.log(`     zone : ${zone}`)
      console.log(`    owner : ${owner}`)
      console.log(`    state : ${stateColor(state)} (${stateReason || 'NORMAL'})`)
      console.log(`       up : ${up}`)
      console.log(`    ready : ${ready}`)
      console.log(`     down : ${down}`)
      console.log(`      age : ${blue(age)}`)
      console.log(`    hours : ${hours}`)
      console.log(`     poof : ${autoTerminate}`)
      console.log(`     apps :`, apps)
      console.log(`   master : [${yellow(master.id)}] ${green(master.type)} `)
      console.log(`  workers : [${yellow(core.id)}] ${green(core.type)} x ${orange(core.count)}`)
    }
  })
  .catch(error => {
    console.error(`Error describing cluster ${yellow(id)} :`, error)
    next(error)
  })

  async function getClusterInfo (ClusterId) {
    const cluster = await emr.describeCluster({ClusterId})
    const groups = await emr.listInstanceGroups({ClusterId})

    return {...cluster, ...groups}
  }

  function stateColor (state) {
    return (state === 'RUNNING' ? green : (
      state === 'TERMINATED_WITH_ERRORS' ? red : (
          state === 'TERMINATED' ? yellow : orange
        )
      )
    )(state)
  }
}
