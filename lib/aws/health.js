const newAws = require('./aws')

module.exports = require('mem')(newAwsHealth)

function newAwsHealth (options) {
  const aws = newAws(options)
  const health = new aws.api.Health(aws.config)

  return {
    listEvents: listEvents(health),
    aws,
    api: health
  }
}

function listEvents (health) {
  return (options = {}) => {
    return new Promise((resolve, reject) => {
      health.describeEvents(options, (error, data) => {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      })
    })
  }
}
