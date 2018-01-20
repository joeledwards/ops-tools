module.exports = {
  command: 'aws-health',
  desc: 'list aws health events',
  handler
}

function handler () {
  const {red, green, emoji} = require('@buzuli/color')
  const {compose, map, sortBy} = require('ramda')

  const health = require('../lib/aws').health()

  health.listEvents()
  .then(data => {
    compose(
      map(({
        arn,
        service,
        region,
        availabilityZone: zone,
        statusCode: status,
        startTime: start,
        endTime: end
      }) => `[${service}] ${region}:${zone}:${arn} (${status}) => ${start} - ${end}`),
      sortBy(({service}) => service)
    )(data.events).forEach(summary => console.log(summary))
    console.log(green(`Successfully fetched AWS health events.`))
  })
  .catch(error => {
    if (error instanceof health.aws.SubscriptionRequiredException) {
      console.error(`Health API is only available for accounts with a support contract.`)
    } else {
      console.error(error)
      console.error(
        red(`Error listing AWS health events.`),
        emoji.inject('Details above :point_up:')
      )
    }
    process.exit(1)
  })
}
