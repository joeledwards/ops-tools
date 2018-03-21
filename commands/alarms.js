module.exports = {
  command: 'alarms',
  desc: 'list configured cloudwatch alarms',
  handler
}

function handler () {
  const {red, yellow, green} = require('@buzuli/color')
  const cw = require('../lib/aws').cloudwatch()

  cw.listAlarms()
    .then(result => {
      const {MetricAlarms: alarms} = result

      if (alarms.length > 0) {
        console.log(yellow(`Alarms:`))
        console.log(alarms)
      } else {
        console.log(green(`No alarms.`))
      }
    })
    .catch(error => {
      console.error(error)
      console.error(red(
        `Instance launch failure in ${yellow(cw.aws.region)}: details above`
      ))
      process.exit(1)
    })
}
