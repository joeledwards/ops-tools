const newAws = require('./aws')
const promised = require('./promised')

const {
  compose, filter, flatten, map, path
} = require('ramda')

module.exports = require('mem')(newEc2)

function newEc2 (options) {
  const aws = newAws(options)
  const ec2 = new aws.api.EC2(aws.config)

  return {
    findInstances: findInstances(ec2),
    listInstances: listInstances(ec2),
    aws,
    api: ec2
  }
}

function listInstances (ec2) {
  return promised(ec2.describeInstances.bind(ec2))
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
