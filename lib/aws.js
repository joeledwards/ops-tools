const aws = require('aws-sdk')

const region = process.env.AWS_REGION

aws.config = new aws.Config({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
})

module.exports = {
  region,
  api: aws
}
