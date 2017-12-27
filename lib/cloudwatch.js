const newAws = require('./aws')

const {
  compose, filter, flatten, map, path
} = require('ramda')

function listAlarms(cw) {
  return (options = {}) => {
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
}

module.exports = options => {
  const aws = newAws(options)
  const cw = new aws.api.CloudWatch()

  return {
    listAlarms,
    aws,
    api: cw
  }
}
