module.exports = {
  command: 'ami-publish <region> <ami>',
  desc: 'make the identified AMI public',
  builder,
  handler
}

function builder (yargs) {
  return yargs
    .option('simulate', {
      type: 'boolean',
      default: false,
      desc: 'perform a dry run of the operation'
    })
}

function handler ({ region, ami, simulate }) {
  const c = require('@buzuli/color')
  const { ec2: newEc2 } = require('../lib/aws')

  console.info(`Publishing image ${c.blue(ami)} from ${c.yellow(region)}`)

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

  let log = {
    debug: logWarp(console.debug.bind(console)),
    error: logWarp(console.error.bind(console)),
    info: logWarp(console.info.bind(console)),
    warn: logWarp(console.warn.bind(console))
  }

  setSimulate(simulate)

  const ec2 = newEc2({ region })

  publishImage({ ec2, ami, simulate })

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
        log.debug(c.green(`Published image ${c.yellow(ami)} in region ${c.yellow(region)}`))

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
              c.red(`Error publishing image ${c.yellow(ami)} in region ${c.yellow(region)}.`),
              c.emoji.inject(`Details above :point_up:`)
            )

            reject(error)
          } else {
            log.debug(data)
            log.debug(c.green(`Updated image ${c.yellow(ami)} in region ${c.yellow(region)}`))

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
