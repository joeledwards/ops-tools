const aws = require('./aws')

const {
  compose, filter, flatten, map, path
} = require('ramda')

const ec2 = new aws.api.EC2()

function listInstances (options) {
  return new Promise((resolve, reject) => {
    ec2.describeInstances(options, (error, data) => {
      if (error)
        reject(error)
      else
        resolve(data)
    })
  })
}

const defaultFindOptions = {
  awsOptions: {},
  fieldExtractor: instance => instance,
  instanceFilter: instance => true
}

function findInstances (options = {}) {
  const {
    awsOptions,
    fieldExtractor,
    instanceFilter
  } = {...defaultFindOptions, ...options}

  return listInstances(awsOptions)
  .then(data => {
    return compose(
      map(fieldExtractor),
      filter(instanceFilter),
      flatten,
      map(path(['Instances']))
    )(data.Reservations)
  })
}

module.exports = {
  findInstances,
  listInstances,
  aws,
  api: ec2
}
