const aws = require('./aws')

const {
  compose, filter, flatten, map, path
} = require('ramda')

const cw = new aws.api.CloudWatch()

function listAlarms(options = {}) {
  return new Promise((resolve, reject) => {
    cw.describeAlarms(options, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}

module.exports = {
  listAlarms,
  aws,
  api: cw
}
