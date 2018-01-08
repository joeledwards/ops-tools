const newAws = require('./aws')

module.exports = require('mem')(newEmr)

function newEmr (options) {
  const aws = newAws(options)
  const emr = new aws.api.EMR(aws.config)

  return {
    listClusters: listClusters(emr),
    describeCluster: describeCluster(emr),
    aws,
    api: emr
  }
}

function listClusters (emr) {
  return (options) => {
    return new Promise((resolve, reject) => {
      emr.listClusters(options, (error, data) => {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      })
    })
  }
}

function describeCluster (emr) {
  return (options) => {
    return new Promise((resolve, reject) => {
      emr.describeCluster(options, (error, data) => {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      })
    })
  }
}
