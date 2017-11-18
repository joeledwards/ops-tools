const aws = require('./aws')

const s3 = new aws.api.S3()

module.exports = {
  aws,
  api: s3
}
