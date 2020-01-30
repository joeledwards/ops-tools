module.exports = {
  command: 'aws-health',
  desc: 'list aws health events',
  handler
}

function handler () {
  const c = require('@buzuli/color')
  const moment = require('moment')
  const durations = require('durations')
  const { compose, map, sortBy } = require('ramda')

  const time = require('../lib/time')
  const health = require('../lib/aws').health()

  health.listEvents()
    .then(data => {
      console.info(data.events[0])

      compose(
        sortBy(({ service, statusCode }) => [statusCode, service])
      )(data.events).forEach(({
        arn,
        service,
        region,
        availabilityZone: zone,
        statusCode: status,
        startTime: start,
        endTime: end,
        eventTypeCategory: category,
        eventTypeCode: code
      }) => {
        console.info(` service : ${service}`)
        console.info(`  region : ${c.blue(region)}`)
        console.info(`    zone : ${c.orange(zone)}`)
        console.info(`     arn : ${c.yellow(arn)}`)
        console.info(`  status : ${(status === 'closed') ? c.grey(status) : c.red.bold(status)}`)
        console.info(`  detail : ${c.purple(category)} => ${code}`)
        console.info(` elapsed : ${c.blue(time.diff(start, end))}`)
        console.info(`   start : ${time.color(start)}`)
        console.info(`     end : ${time.color(end)}`)
        console.info(``)
      })

      console.log('Successfully fetched AWS health events.')
    })
    .catch(error => {
      if (error.code === 'SubscriptionRequiredException') {
        console.error('Health API is only available for accounts with a support contract.')
      } else {
        console.error(error)
        console.error(
          c.red(`Error listing AWS health events. Details above ${c.yellow('^')}`)
        )
      }
      process.exit(1)
    })
}
