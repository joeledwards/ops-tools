module.exports = {
  command: 's3-buckets',
  desc: 'list out region S3 buckets',
  handler
}

function handler () {
  const c = require('@buzuli/color')
  const s3 = require('../lib/aws').s3()
  const r = require('ramda')

  s3.listBuckets()
    .then(async ({Buckets: buckets}) => {
      const regionDecor = c.pool()

      console.log(
        (await Promise.all(
          buckets.map(({Name: bucket}) => {
            return s3.getBucketLocation({Bucket: bucket})
              .then(({LocationConstraint: region}) => {
                return {
                  bucket,
                  region: r.isEmpty(region) ? 'us-east-1' : region
                }
              })
          })
        ))
          .map(({bucket, region}) => {
            return `  [${regionDecor(region)}] ${c.yellow(bucket)}`
          })
          .join('\n')
      )

      const count = buckets.length
      console.log(c.green(
        `Listed ${c.orange(count)} buckets for region ${c.yellow(s3.aws.region)}`
      ))
    })
    .catch(error => {
      console.error(error)
      console.error(c.red(c.emoji.inject(
        `Error listing buckets in ${c.yellow(s3.aws.region)}: details above :point_up:`
      )))
      process.exit(1)
    })
}
