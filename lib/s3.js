const newAws = require('./aws')

module.exports = options => {
  const aws = newAws(options)
  const s3 = new aws.api.S3()

  return {
    aws,
    api: s3
  }
}
