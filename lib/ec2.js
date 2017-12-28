const newAws = require('./aws')

const {
  compose, filter, flatten, map, path
} = require('ramda')

function listInstances (ec2) {
  return (options) => {
    return new Promise((resolve, reject) => {
      ec2.describeInstances(options, (error, data) => {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      })
    })
  }
}

const defaultFindOptions = {
  awsOptions: {},
  fieldExtractor: instance => instance,
  instanceFilter: instance => true
}

function findInstances (ec2) {
  return (options = {}) => {
    const {
      awsOptions,
      fieldExtractor,
      instanceFilter
    } = {...defaultFindOptions, ...options}

    return listInstances(ec2)(awsOptions)
    .then(data => {
      return compose(
        map(fieldExtractor),
        filter(instanceFilter),
        flatten,
        map(path(['Instances']))
      )(data.Reservations)
    })
  }
}

module.exports = options => {
  const aws = newAws(options)
  const ec2 = new aws.api.EC2(aws.config)

  return {
    findInstances: findInstances(ec2),
    listInstances: listInstances(ec2),
    aws,
    api: ec2
  }
}
