module.exports = {
  command: 's3-info <bucket> <key>',
  desc: 'Get metadata for an S3 object',
  handler
}

function handler ({ bucket, key }) {
  const buzJson = require('@buzuli/json')
  const c = require('@buzuli/color')

  const s3 = require('../lib/aws/s3')()

  const options = {
    Bucket: bucket,
    Key: key
  }

  s3.headObject(options)
    .then(metadata => {
      console.log(`Metadata for s3://${c.blue(bucket)}/${c.yellow(key)}:`)
      console.log(buzJson(metadata))
    })
    .catch(error => {
      const { statusCode: status, code } = error

      if (status && code) {
        console.error(
          `[${c.red(status)}] ${c.yellow(code)} => s3://${c.blue(bucket)}/${c.yellow(key)}`
        )
      } else {
        console.error(
          `Error fetching metdata for s3://${c.blue(bucket)}/${c.yellow(key)}:\n`,
          error
        )
      }
      process.exit(1)
    })
}
