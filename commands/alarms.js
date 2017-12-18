const chalk = require('chalk')
const cw = require('../lib/cloudwatch')

const {red, yellow, green} = chalk

const options = {
}

cw.listAlarms(options)
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
    `Instance launch failure in ${yellow(ec2.aws.region)}: details above`
  ))
  process.exit(1)
})

