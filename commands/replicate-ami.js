const async = require('async')
const {red, yellow, green} = require('@buzuli/color')
const {head} = require('ramda')
const newEc2 = require('../lib/ec2')
const regions = require('../lib/aws-regions')

function isDryRunError(error) {
  return error.code === 'DryRunOperation'
}

// Copy an AMI from another region to the current region.
function copyImage ({ec2, srcRegion, srcAmi, amiName, amiDesc, simulate}) {
  return new Promise((resolve, reject) => {
    const options = {
      DryRun: simulate,
      SourceRegion: srcRegion,
      SourceImageId: srcAmi,
      Name: amiName,
      Description: amiDesc
    }

    ec2.api.copyImage(options, (error, data) => {
      if (error) {
        if (simulate && isDryRunError(error)) {
          resolve({
            ami: 'sim-ami'
          })
        } else {
          reject(error)
        }
      } else {
        resolve({
          ami: data.ImageId
        })
      }
    })
  })
}

// Make an AMI public
function publishImage ({ec2, ami, simulate}) {
  return new Promise((resolve, reject) => {
    // Make the image public.
    const region = ec2.aws.region
    const options = {
      DryRun: simulate,
      ImageId: ami,
      Attribute: 'launchPermission',
      LaunchPermission: {
        Add: [{Group: 'all'}]
      }
    }

    ec2.api.modifyImageAttribute(options, (error, data) => {
      if (error) {
        if (simulate && isDryRunError(error)) {
          resolve({
            ami,
            region,
            published: true
          })
          console.log(green(
            `[SIMULATED] Updated image ${yellow(ami)} in region ${yellow(region)}`
          ))
        } else {
          console.error(error)
          console.error(red(
            `Error updating image ${yellow(ami)} in region ${yellow(region)} : details above`
          ))

          reject(error)
        }
      } else {
        console.log(data)
        console.log(green(`Updated image ${yellow(ami)} in region ${yellow(region)}`))

        resolve({
          ami,
          region,
          published: true
        })
      }
    })
  })
}

// Fetch AMI details
function getImageInfo ({srcRegion, srcAmi, simulate}) {
  return new Promise((resolve, reject) => {
    const ec2 = newEc2({region: srcRegion})

    const options = {
      DryRun: simulate,
      ImageIds: [srcAmi]
    }

    ec2.api.describeImages(options, (error, data) => {
      if (error) {
        if (simulate && isDryRunError(error)) {
          resolve({
            name: 'sim-ami-name',
            description: 'sim ami description',
            public: true
          })
        } else {
          reject(error)
        }
      } else {
        const img = head(data.Images)
        resolve({
          name: img.Name,
          description: img.Description,
          public: img.Public
        })
      }
    })
  })
}

// Copy, update, and optionally publish an AMI
function replicateImage (options) {
  const {dstRegion, amiName, amiDesc, publish} = options
  const ec2 = newEc2({region: dstRegion})

  return getImageInfo(options)
  .then(({name, description}) => {
    return copyImage({
      ...options,
      ec2,
      amiName: amiName || name,
      amiDesc: amiDesc || description
    })
  })
  .then(({ami}) => {
    if (publish) {
      return publishImage({ec2, region: dstRegion, ami})
    } else {
      return {
        ami,
        region: ec2.aws.region,
        published: false
      }
    }
  })
}

// Run through all regions
function handler (argv) {
  console.log(yellow('Configuration:'), argv)
  const {srcRegion, srcAmi} = argv

  // Map each region to a replicator function.
  const actions = regions.general
    .filter(region => region === srcRegion)
    .map(dstRegion => {
      return next => {
        replicateImage({...argv, dstRegion})
        .then(() => next(), next)
      }
    })

  // Process the regions in sequence.
  //*
  async.series(actions, error => {
    if (error) {
      console.error(error)
      console.error(red(
        `Error replicating image ${srcRegion}:${srcAmi} :`
      ), 'details above')
    } else {
      console.log(green('AMI replicated to all target regions'))
    }
  })
  //*/
}

function builder (yargs) {
  return yargs
    .option('description', {
      aliases: ['ami-desc'],
      type: 'string',
      desc: 'AMI description (defaults to that of the source AMI)'
    })
    .option('name', {
      aliases: ['ami-name'],
      type: 'string',
      desc: 'AMI name (defaults to that of the source AMI)'
    })
    .option('publish', {
      type: 'boolean',
      default: false,
      desc: 'make the AMI publicly available'
    })
    .option('simulate', {
      type: 'boolean',
      default: false,
      desc: 'perform a dry run of the operation'
    })
}

module.exports = {
  command: 'replicate-ami <src-region> <src-ami>',
  desc: 'replicate an AMI from one region to all others',
  builder,
  handler
}
