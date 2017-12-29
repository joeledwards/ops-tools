const aws = require('aws-sdk')

module.exports = require('mem')(newAws)

function newAws (options = {}) {
  const region = options.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
  const accessKeyId = options.accessKey || process.env.AWS_ACCESS_KEY
  const secretAccessKey = options.secretKey || process.env.AWS_SECRET_KEY

  const config = new aws.Config({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  })

  return {
    region,
    config,
    api: aws
  }
}

