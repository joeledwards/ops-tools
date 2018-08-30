module.exports = {
  command: 's3-list <bucket>',
  desc: 'List keys in an s3 bucket',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('after', {
      type: 'string',
      desc: 'scans keys in lexical sort order after this value',
      alias: ['a']
    })
    .option('delimiter', {
      type: 'string',
      desc: 'group keys which have the same prefix up to this delimiter',
      alias: ['d']
    })
    .option('limit', {
      type: 'number',
      desc: 'maximum number of keys to list',
      alias: ['l'],
      default: 50
    })
    .option('prefix', {
      type: 'string',
      desc: 'prefix of keys to list',
      alias: ['p']
    })
}

function handler ({ after, bucket, limit, prefix }) {
  if (limit > 1000) {
    console.error(`Maximum limit of 1000 for now.`)
    process.exit(1)
  }

  const { blue, gray, orange, yellow } = require('@buzuli/color')
  const age = require('../lib/age')
  const s3 = require('../lib/aws/s3')()

  const options = {
    Bucket: bucket,
    MaxKeys: limit,
    Prefix: prefix,
    StartAfter: after
  }

  // TODO: add continuation logic
  s3.listKeys(options)
    .then(({
      IsTruncated: truncated, // Has more
      Contents: keys
    }) => {
      keys.forEach(({
        Key: key,
        Size: size,
        LastModified: mtime
      }) => console.log(
        gray(`[age ${blue(age(mtime))} : ${orange(size)} bytes]`) + ` ${key}`
      ))
      console.log(
        `Listed ${orange(keys.length)} keys from bucket ${yellow(bucket)}`
      )
    })
    .catch(error => {
      console.error(`Error listing keys in bucket '${yellow(bucket)}' :`, error)
      process.exit(1)
    })
}
