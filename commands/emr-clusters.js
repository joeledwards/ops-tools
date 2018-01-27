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
    desc: 'show clusters in any state (terminated states exclued by default; overrides --state)',
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
  const {blue, gray, green, orange, red, yellow} = require('@buzuli/color')
  const durations = require('durations')
  const moment = require('moment')
  const r = require('ramda')

  const computeAge = require('../lib/age')
  const emr = require('../lib/aws').emr()
  const region = emr.aws.region

  const ClusterStates = any ? ALL_STATES : (
    state ? [state] : DEFAULT_STATES
  )

  emr.listClusters({ClusterStates})
  .then(({Clusters: clusters}) => {
    const clusterCount = Math.min(clusters.length, all ? clusters.length : limit)

    r.take(clusterCount)(clusters).forEach(cluster => {
      const {
        Id: id,
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
        NormalizedInstanceHours: hours
      } = cluster

      const up = upTime ? upTime.toISOString() : 'n/a'
      const ready = readyTime ? readyTime.toISOString() : 'n/a'
      const down = downTime ? downTime.toISOString() : 'n/a'
      const age = computeAge(upTime, downTime)

      console.log(`Cluster ${yellow(id)} (${green(name)})`)
      console.log(`   region : ${yellow(region)}`)
      console.log(`    state : ${stateColor(state)} (${reasonColor(reasonCode, reasonMessage)})`)
      console.log(`       up : ${blue(up)}`)
      console.log(`    ready : ${blue(ready)}`)
      console.log(`     down : ${blue(down)}`)
      console.log(`      age : ${blue(age)}`)
      console.log(`    hours : ${orange(hours)}`)
    })

    console.log(`Listed ${orange(clusterCount)} of ${orange(clusters.length)} clusters.`)
  })
  .catch(error => {
    console.error(`Error listing EMR clusters:`, error)
    process.exit(1)
  })

  function reasonColor (code, message) {
    return (code === 'ALL_STEPS_COMPLETED'
      ? green
      : code === 'USER_REQUEST'
      ? yellow
      : r.startsWith('Running')(message)
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
