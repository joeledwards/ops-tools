const newAws = require('./aws')
const promised = require('./promised')

module.exports = require('mem')(newEmr)

function newEmr (options) {
  const aws = newAws(options)
  const emr = new aws.api.EMR(aws.config)

  return {
    listClusters: promised((...args) => emr.listClusters(...args)),
    describeCluster: promised((...args) => emr.describeCluster(...args)),
    listInstanceFleets: promised((...args) => emr.listInstanceFleets(...args)),
    listInstanceGroups: promised((...args) => emr.listInstanceGroups(...args)),
    aws,
    api: emr
  }
}
