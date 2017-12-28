const newAws = require('./aws')

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

module.exports = options => {
  const aws = newAws(options)
  const cw = new aws.api.CloudWatch()

  return {
    listAlarms: listAlarms(cw),
    aws,
    api: cw
  }
}
