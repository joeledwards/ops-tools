module.exports = {
  command: 'alarms',
  desc: 'list configured cloudwatch alarms',
  handler
}

function handler () {
  const c = require('@buzuli/color')
  const buzJson = require('@buzuli/json')
  const cw = require('../lib/aws').cloudwatch()

  cw.listAlarms()
    .then(result => {
      const {MetricAlarms: alarms} = result

      if (alarms.length > 0) {
        console.log(c.yellow(`Alarms:`))
        console.log(buzJson(alarms))
      } else {
        console.log(c.green(`No alarms.`))
      }
    })
    .catch(error => {
      console.error(error)
      console.error(c.red(
        `Instance launch failure in ${c.yellow(cw.aws.region)}: details above`
      ))
      process.exit(1)
    })
}
