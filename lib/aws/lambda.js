const newAws = require('./aws')
const promised = require('./promised')
const r = require('ramda')

module.exports = require('mem')(newLambda)

function newLambda (options) {
  const aws = newAws(options)
  const lambda = new aws.api.Lambda(aws.config)

  return {
    listFunctions: listFunctions(lambda),
    aws,
    api: lambda
  }
}

function listFunctions (lambda) {
  return promised(lambda.listFunctions.bind(lambda))
}

