const newAws = require('./aws')
const promised = require('./promised')

module.exports = require('mem')(newEmr)

function newEmr (options) {
  const aws = newAws(options)
  const emr = new aws.api.EMR(aws.config)

  return {
    listClusters: promised(emr.listClusters.bind(emr)),
    describeCluster: promised(emr.describeCluster.bind(emr)),
    listInstanceFleets: promised(emr.listInstanceFleets.bind(emr)),
    listInstanceGroups: promised(emr.listInstanceGroups.bind(emr)),
    aws,
    api: emr
  }
}
