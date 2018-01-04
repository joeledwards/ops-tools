const newAws = require('./aws')

module.exports = require('mem')(newCw)

function newCw (options) {
  const aws = newAws(options)
  const cw = new aws.api.CloudWatch()

  return {
    listAlarms: listAlarms(cw),
    aws,
    api: cw
  }
}

function listAlarms (cw) {
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
