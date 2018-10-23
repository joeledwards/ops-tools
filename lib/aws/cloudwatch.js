const newAws = require('./aws')
const promised = require('./promised')

module.exports = require('mem')(newCw)

function newCw (options) {
  const aws = newAws(options)
  const cw = new aws.api.CloudWatch()
  const cwl = new aws.api.CloudWatchLogs()

  return {
    listAlarms: listAlarms(cw),
    logs: {
      filterEvents: filterEvents(cwl),
      listGroups: listGroups(cwl),
      listStreams: listStreams(cwl),
      getEvents: getEvents(cwl)
    },
    aws,
    api: cw,
    logsApi: cwl
  }
}

// CloudWatch
function listAlarms (cw) {
  return promised(cw.describeAlarms.bind(cw))
}

// CloudWatchLogs
function filterEvents (cwl) {
  return promised(cwl.filterLogEvents.bind(cwl))
}

function listGroups (cwl) {
  return promised(cwl.describeLogGroups.bind(cwl))
}

function listStreams (cwl) {
  return promised(cwl.describeLogStreams.bind(cwl))
}

function getEvents (cwl) {
  return promised(cwl.getLogEvents.bind(cwl))
}
