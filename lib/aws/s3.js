const newAws = require('./aws')
const promised = require('./promised')

module.exports = require('mem')(newS3)

function newS3 (options) {
  const aws = newAws(options)
  const s3 = new aws.api.S3()

  return {
    listKeys: promised(s3.listObjectsV2.bind(s3)),
    listBuckets: promised(s3.listBuckets.bind(s3)),
    getBucketLocation: promised(s3.getBucketLocation.bind(s3)),
    getObject: promised(s3.getObject.bind(s3)),
    headObject: promised(s3.headObject.bind(s3)),
    aws,
    api: s3
  }
}
