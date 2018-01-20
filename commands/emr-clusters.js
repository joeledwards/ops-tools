module.exports = {
  command: 'emr-clusters',
  desc: 'List out EMR clusters for a region',
  handler
}

function handler () {
  const {blue, emoji, green, orange, red, yellow} = require('@buzuli/color')
  const durations = require('durations')
  const async = require('async')
  const moment = require('moment')
  const {map} = require('ramda')

  const emr = require('../lib/aws').emr()
  const region = emr.aws.region

  emr.listClusters({
    ClusterStates: [
      'STARTING', 'BOOTSTRAPPING', 'RUNNING',
      'WAITING', 'TERMINATING', 'TERMINATED_WITH_ERRORS']
  })
  .then(({Clusters: clusters}) => {
    return new Promise((resolve, reject) => {
      const tasks = map(({Id: id, Name: name, Status: status}) => {
        return next => {
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

            console.log(`Cluster ${yellow(id)} (${blue(name)})`)
            console.log(`     zone : ${zone}`)
            console.log(`    owner : ${owner}`)
            console.log(`    state : ${stateColor(state)} (${stateReason || 'NORMAL'})`)
            console.log(`       up : ${up}`)
            console.log(`    ready : ${ready}`)
            console.log(`     down : ${down}`)
            console.log(`      age : ${orange(age)}`)
            console.log(`    hours : ${hours}`)
            console.log(`     poof : ${autoTerminate}`)
            console.log(`     apps :`, apps)

            next()
          })
          .catch(error => {
            console.error(`Error describing cluster ${yellow(id)} (${blue(name)}) :`, error)
            next(error)
          })
        }
      })(clusters)

      async.series(tasks, error => {
        if (error) {
          reject(error)
        } else {
          console.log(`Found ${tasks.length} EMR cluster(s).`)
          resolve()
        }
      })
    })
  })
  .catch(error => {
    console.error(error)
    console.error(
      `Error listing EMR clusters in region ${yellow(region)}.`,
      emoji.inject('Details above :point_up:')
    )
    process.exit(1)
  })

  function stateColor (state) {
    return ('RUNNING' == state ? green : (
      'TERMINATED_WITH_ERRORS' == state ? red : (
          'TERMINATED' == state ? yellow : orange
        )
      )
    )(state)
  }
}
