module.exports = {
  command: 's3-buckets',
  desc: 'list out region S3 buckets',
  handler
}

function handler () {
  const c = require('@buzuli/color')
  const s3 = require('../lib/aws').s3()

  s3.listBuckets()
    .then(result => {
      const buckets = result.Buckets.map(({Name}) => c.blue(Name))
      const count = buckets.length
      console.log(buckets.join('\n'))
      console.log(c.green(
        `Listed ${c.orange(count)} buckets for region ${c.yellow(s3.aws.region)}`
      ))
    })
    .catch(error => {
      console.error(error)
      console.error(c.red(
        `Error listing buckets in ${c.yellow(s3.aws.region)}: details above :point_up:`
      ))
      process.exit(1)
    })
}
