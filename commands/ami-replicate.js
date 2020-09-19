module.exports = {
  command: 'ami-replicate <region> <ami>',
  desc: 'replicate an AMI from one region to all others',
  builder,
  handler
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
      desc: 'make the AMI publicly available'
    })
    .option('simulate', {
      type: 'boolean',
      desc: 'perform a dry run of the operation'
    })
}

async function handler (options) {
  const c = require('@buzuli/color')

  try {
    await replicateAmi(options)
    console.info(c.green('AMI replicated to all target regions'))
  } catch (error) {
    const {
      srcRegion,
      srcAmi
    } = options
    console.error(error)
    console.error(
      c.red(`Error replicating image ${c.blue(srcRegion)}:${c.yellow(srcAmi)}.`),
      c.emoji.inject('Details above :point-up:')
    )
    process.exit(1)
  }
}

// Run through all regions
async function replicateAmi ({
  region: srcRegion,
  ami: srcAmi,
  simulate,
  publish,
  name,
  description
}) {
  const options = {
    srcRegion,
    srcAmi,
    simulate,
    publish,
    name,
    description
  }

  const c = require('@buzuli/color')
  const r = require('ramda')
  const poller = require('promise-poller').default
  const random = require('../lib/random')
  const { regions, ec2: newEc2 } = require('../lib/aws')

  let sim
  const setSimulate = simulate => {
    sim = (simulate === true) ? `[${c.purple('SIMULATE')}]` : null
  }
  const logWarp = logFunc => (...args) => {
    if (sim) {
      args.unshift(sim)
    }

    logFunc(...args)
  }

  const log = {
    debug: logWarp(console.debug.bind(console)),
    error: logWarp(console.error.bind(console)),
    info: logWarp(console.info.bind(console)),
    warn: logWarp(console.warn.bind(console))
  }

  setSimulate(simulate)

  log.info(`Replicating image ${c.yellow(srcAmi)} from ${c.blue(srcRegion)} to all regions`)
  log.info(`   visibility: ${publish ? 'public' : 'private'}`)
  log.info(`   simulation: ${simulate}`)
  log.info(`         name: ${name || 'use source AMI name'}`)
  log.info(`  description: ${description || 'use source AMI description'}`)
  log.info()

  for (const dstRegion of regions.general) {
    if (dstRegion !== srcRegion) {
      log.info(`Replicating ${c.yellow(srcAmi)} from ${c.blue(srcRegion)} to ${c.blue(dstRegion)}`)

      const { published, ami } = await replicateImage({ dstRegion, ...options })
      const action = published ? 'published' : 'copied'
      const icon = c.emoji.inject(published ? ':gift:' : ':lock:')

      log.info(`Successfully ${action} to ${c.blue(dstRegion)} as ${c.green(ami)} ${icon}`)
    }
  }

  // Fetch AMI details
  function getImageInfo ({ region, ami, simulate }) {
    return new Promise((resolve, reject) => {
      const ec2 = newEc2({ region })

      const options = {
        DryRun: simulate,
        ImageIds: [ami]
      }

      ec2.api.describeImages(options, (error, data) => {
        if (error) {
          if (simulate && isDryRunError(error)) {
            resolve({
              description: 'source ami description',
              name: 'source-ami-name',
              public: true,
              state: 'available'
            })
          } else {
            reject(error)
          }
        } else {
          const img = r.head(data.Images) || {}
          resolve({
            description: img.Description,
            name: img.Name,
            public: img.Public,
            state: img.State
          })
        }
      })
    })
  }

  // Copy, update, and optionally publish an AMI
  function replicateImage (options) {
    const { srcRegion, srcAmi, dstRegion, amiName, amiDesc, publish, simulate } = options
    const ec2 = newEc2({ region: dstRegion })

    return getImageInfo({ region: srcRegion, ami: srcAmi, simulate })
      .then(({ name, description }) => {
        return copyImage({
          ...options,
          ec2,
          amiName: amiName || name,
          amiDesc: amiDesc || description
        })
      })
      .then(({ ami }) => {
        if (publish) {
          return pollAmiReady({ region: dstRegion, ami, simulate })
            .then(() => publishImage({ ec2, ami, simulate }))
        } else {
          return {
            ami,
            region: ec2.aws.region,
            published: false
          }
        }
      })
  }

  function isDryRunError (error) {
    return error.code === 'DryRunOperation'
  }

  // Poll an AMI to determine when it is available
  function pollAmiReady (options) {
    const { region, ami, simulate } = options

    let bail = false
    let failures = 1
    const taskFn = () => {
      if (bail) {
        return false
      } else if (simulate && failures-- > 0) {
        return Promise.resolve({
          state: 'pending'
        })
      } else {
        return getImageInfo(options)
      }
    }

    return poller({
      interval: 5000,
      timeout: 5000,
      retries: 30,
      shouldContinue: (cause, value) => {
        if (cause) {
          log.error(c.red(`Error polling state of ${c.yellow(ami)} :`), `${cause}`)
        } else {
          if (value.state === 'available') {
            log.info(c.emoji.inject(`Image ${c.blue(region)}:${c.yellow(ami)} is available :tada:`))
            return false
          } else if (value.state === 'pending') {
            log.info(`Image ${c.blue(region)}:${c.yellow(ami)} is not ready [state=${c.red(value.state)}]`)
          } else {
            log.error(`Bad state (${c.red(value.state)}) for image ${c.blue(region)}:${c.yellow(ami)}`)
            bail = true
            return true
          }
        }

        return true
      },
      taskFn
    })
  }

  // Copy an AMI from another region to the current region.
  function copyImage ({ ec2, srcRegion, srcAmi, amiName, amiDesc, simulate }) {
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
            resolve(
              random.hex(8).then(hex => ({
                ami: `ami-${hex}`
              }))
            )
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
  function publishImage ({ ec2, ami, simulate }) {
    return new Promise((resolve, reject) => {
      // Make the image public.
      const region = ec2.aws.region
      const options = {
        ImageId: ami,
        Attribute: 'launchPermission',
        LaunchPermission: {
          Add: [{ Group: 'all' }]
        }
      }

      if (simulate) {
        log.debug(c.green(`Published image ${c.yellow(ami)} in region ${c.blue(region)}`))

        resolve({
          ami,
          region,
          published: true
        })
      } else {
        ec2.api.modifyImageAttribute(options, (error, data) => {
          if (error) {
            log.error(error)
            log.error(
              c.red(`Error publishing image ${c.yellow(ami)} in region ${c.blue(region)}.`),
              c.emoji.inject('Details above :point-up:')
            )

            reject(error)
          } else {
            log.debug(data)
            log.debug(c.green(`Updated image ${c.yellow(ami)} in region ${c.blue(region)}`))

            resolve({
              ami,
              region,
              published: true
            })
          }
        })
      }
    })
  }
}
