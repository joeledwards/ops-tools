const chalk = require('chalk')
const ec2 = require('../lib/ec2')()

const {red, yellow, green} = chalk

const options = {
  ImageId: 'ami-4f41a537',
  InstanceType: 'c3.xlarge',
  KeyName: 'joel-west',
  MinCount: 1,
  MaxCount: 1,
  SecurityGroups: [
      "git-deploy"
    , "corporate"
    , "default"
    , "fastly"
  ],
  Placement: {
    AvailabilityZone: 'us-west-2a'
  }
}

options.DryRun = true

function launchInstances (options) {
  return new Promise((resolve, reject) => {
    ec2.api.runInstances(options, (error, result) => {
      if (error) {
        if (error.code === 'DryRunOperation') {
          resolve({
            action: 'test-launch', outcome: 'success'
          })
        } else {
          reject(error)
        }
      } else {
        resolve(result)
      }
    })
  })
}

launchInstances(options)
.then(result => {
  console.log(yellow('Config'))
  console.log(options)
  console.log()
  console.log(yellow('Outcome'))
  console.log(result)
  console.log()
  console.log(green(
    `Instance launch will succeed in region ${yellow(ec2.aws.region)}`
  ))
})
.catch(error => {
  console.error(error)
  console.error(red(
    `Instance launch failure in ${yellow(ec2.aws.region)}: details above`
  ))
  process.exit(1)
})

