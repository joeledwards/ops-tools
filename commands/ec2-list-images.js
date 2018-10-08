module.exports = {
  command: 'ec2-list-images',
  desc: 'list AMIs in the current region',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('ids-only', {
      type: 'boolean',
      desc: 'only list AMI IDs',
      default: false,
      alias: 'i'
    })
    .options('json', {
      type: 'boolean',
      desc: 'display raw JSON region records from EC2 API call',
      default: false,
      alias: 'j'
    })
    .option('limit', {
      type: 'number',
      desc: 'limit to this number of responses',
      alias: 'l'
    })
}

async function handler ({ idsOnly, json, limit }) {
  const c = require('@buzuli/color')
  const r = require('ramda')
  const age = require('../lib/age')
  const ec2 = require('../lib/aws').ec2()
  const pad = require('../lib/pad')
  const moment = require('moment')
  const buzJson = require('@buzuli/json')

  try {
    const { Images: images } = await ec2.listImages({ Owners: ['self'] })
    if (json) {
      console.info(buzJson(limit ? r.take(limit)(images) : images))
    } else {
      const total = images.length
      const count = limit ? Math.min(total, limit) : total
      console.info(r.compose(
        r.join('\n'),
        r.take(limit || total),
        r.map(({ id, name, created }) => {
          const now = moment.utc()
          const time = moment(created)
          const timeStr = c.gray(time.format('YYYY-MM-DD HH:mm'))
          const regionStr = c.green(ec2.aws.region)
          const idStr = c.yellow(id)
          const ageStr = c.orange(pad(12, age(time, now).toString(), false))
          const nameStr = c.blue(name)
          if (idsOnly) {
            return id
          } else {
            return `[${timeStr} | ${ageStr}] ${regionStr}:${idStr} ${nameStr}`
          }
        }),
        r.sortBy(({ created }) => created),
        r.map(
          ({
            ImageId: id,
            Name: name,
            CreationDate: created
          }) => ({ id, name, created: created })
        )
      )(images))

      if (!idsOnly) {
        if (count !== total) {
          console.info(`Displaying ${c.orange(count)} of ${c.orange(total)} AMIs`)
        } else {
          console.info(`Displaying all ${c.orange(total)} AMIs`)
        }
      }
    }
  } catch (error) {
    if (error.code === 'InvalidAMIID.NotFound') {
      console.info(`No AMIs found for region ${c.yellow(ec2.aws.region)}`)
    } else {
      console.error(error)
      console.error(c.emoji.inject(c.red(
        `Error listing AMIs for region ${c.yellow(ec2.aws.region)}: ` +
        'Details above :point_up:'
      )))
    }
  }
}
