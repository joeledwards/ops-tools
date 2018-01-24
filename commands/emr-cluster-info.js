module.exports = {
  command: 'emr-cluster-info <cluster-id>',
  desc: 'Get details on a single EMR cluster',
  handler
}

function handler ({clusterId: id}) {
  const {blue, emoji, green, orange, red, yellow} = require('@buzuli/color')
  const durations = require('durations')
  const moment = require('moment')

  const emr = require('../lib/aws').emr()
  const region = emr.aws.region

  emr.describeCluster({
    ClusterId: id
  }).then(info => {
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
      }
    } = info

    const up = upTime ? upTime.toISOString() : 'n/a'
    const ready = readyTime ? readyTime.toISOString() : 'n/a'
    const down = downTime ? downTime.toISOString() : 'n/a'
    const end = moment(downTime || new Date())
    const age = durations.millis(end.diff(upTime))

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
  })
  .catch(error => {
    console.error(`Error describing cluster ${yellow(id)} :`, error)
    next(error)
  })

  function stateColor (state) {
    return (state === 'RUNNING' ? green : (
      state === 'TERMINATED_WITH_ERRORS' ? red : (
          state === 'TERMINATED' ? yellow : orange
        )
      )
    )(state)
  }
}
