module.exports = {
  command: 'emr-clusters',
  desc: 'List out EMR clusters for a region',
  builder,
  handler
}

const ALL_STATES = [
  'BOOTSTRAPPING',
  'RUNNING',
  'STARTING',
  'TERMINATED',
  'TERMINATED_WITH_ERRORS',
  'TERMINATING',
  'WAITING'
]

const DEFAULT_STATES = [
  'BOOTSTRAPPING',
  'RUNNING',
  'STARTING',
  'TERMINATED_WITH_ERRORS',
  'TERMINATING',
  'WAITING'
]

const DEFAULT_LIMIT = 10

function builder (yargs) {
  const r = require('ramda')

  yargs
  .option('all', {
    type: 'boolean',
    desc: `show all clusters (normally limited to ${DEFAULT_LIMIT}; overrides --limit)`,
    default: 'false',
    alias: ['all-states', 'a']
  })
  .option('any', {
    type: 'boolean',
    desc: 'show clusters in any state (normally exludes TERMINATED; overrides --state)',
    default: 'false',
    alias: ['any-state', 'A']
  })
  .option('limit', {
    type: 'number',
    desc: 'maximum number of clusters to list',
    default: DEFAULT_LIMIT,
    alias: ['l']
  })
  .options('state', {
    type: 'string',
    desc: 'show clusters with the specified state',
    coerce: v => (typeof v === 'string') ? r.toUpper(v) : v,
    choices: ALL_STATES,
    alias: ['s']
  })
}

function handler ({any, all, state, limit}) {
  const {blue, emoji, gray, green, orange, red, yellow} = require('@buzuli/color')
  const durations = require('durations')
  const async = require('async')
  const moment = require('moment')
  const r = require('ramda')

  const emr = require('../lib/aws').emr()
  const region = emr.aws.region

  const ClusterStates = any ? ALL_STATES : (
    state ? [state] : DEFAULT_STATES
  )
  
  emr.listClusters({ClusterStates})
  .then(({Clusters: clusters}) => {
    const clusterCount = all ? clusters.length: limit

    r.take(clusterCount)(clusters).forEach(cluster => {
      const {
        Id: id,
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
        NormalizedInstanceHours: hours
      } = cluster

      const up = upTime ? upTime.toISOString() : 'n/a'
      const ready = readyTime ? readyTime.toISOString() : 'n/a'
      const down = downTime ? downTime.toISOString() : 'n/a'
      const end = moment(downTime || new Date())
      const age = durations.millis(end.diff(upTime))

      console.log(`Cluster ${yellow(id)} (${green(name)})`)
      console.log(`    state : ${stateColor(state)} (${stateReason || 'NORMAL'})`)
      console.log(`       up : ${blue(up)}`)
      console.log(`    ready : ${blue(ready)}`)
      console.log(`     down : ${blue(down)}`)
      console.log(`      age : ${blue(age)}`)
      console.log(`    hours : ${orange(hours)}`)
    })

    console.log(`Listed ${orange(clusterCount)} of ${orange(clusters.length)} clusters.`);
  })

  function stateColor (state) {
    return (state === 'RUNNING' ? green : (
      state === 'TERMINATED_WITH_ERRORS' ? red : (
          state === 'TERMINATED' ? gray : yellow
        )
      )
    )(state)
  }
}
