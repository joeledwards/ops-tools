const newAws = require('./aws')
const promised = require('./promised')
const r = require('ramda')

module.exports = require('mem')(newEc2)

function newEc2 (options) {
  const aws = newAws(options)
  const ec2 = new aws.api.EC2(aws.config)

  return {
    describeAccountAttributes: describeAccountAttributes(ec2),
    findInstances: findInstances(ec2),
    listInstances: listInstances(ec2),
    runInstances: runInstances(ec2),
    listZones: listZones(ec2),
    listRegions: listRegions(ec2),
    listRegionZones,
    aws,
    api: ec2
  }
}

function describeAccountAttributes (ec2) {
  return promised(ec2.describeAccountAttributes.bind(ec2))
}

function runInstances (ec2) {
  return promised(ec2.runInstances.bind(ec2))
}

function listInstances (ec2) {
  return promised(ec2.describeInstances.bind(ec2))
}

function listRegionZones (region) {
  const ec2 = newEc2({Region: region})
  return listZones(ec2)
}

function listZones (ec2) {
  return promised(ec2.describeAvailabilityZones.bind(ec2))
}

function listRegions (ec2) {
  return promised(ec2.describeRegions.bind(ec2))
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
        return r.compose(
          r.map(fieldExtractor),
          r.filter(instanceFilter),
          r.flatten,
          r.map(r.path(['Instances']))
        )(data.Reservations)
      })
  }
}
