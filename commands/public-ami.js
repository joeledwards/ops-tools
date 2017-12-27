
function updateImage([region, ami]) {
  process.env.AWS_REGION = region
  const chalk = require('chalk')
  const ec2 = require('../lib/ec2')

  const {
    compose, filter, head, map, path, pathEq, values
  } = require('ramda')

  const {red, yellow, green} = chalk

  const options = {
    DryRun: simulate,
    ImageId: ami, 
    Attribute: 'launchPermission',
    LaunchPermission: {
      Add: [
        {Group: 'all'}
      ]
    }
  }

  ec2.api.modifyImageAttribute(options, (error, data) => {
    if (error) {
      console.error(error)
      console.error(red(
        `Error updating image ${yellow(ami)} in region ${yellow(region)} : details above`
      ))
    } else {
      console.log(data)
      console.log(green(`Updated image ${yellow(ami)} in region ${yellow(region)}`))
    }
  })
}

const images = [
  [`ap-northeast-1`, `ami-51a93e37`],
  [`ap-northeast-2`, `ami-fe78d990`],
  [`ap-south-1`, `ami-10eda77f`],
  [`ap-southeast-1`, `ami-1b2d4667`],
  [`ap-southeast-2`, `ami-9a7282f8`],
  [`ca-central-1`, `ami-45308a21`],
  [`eu-central-1`, `ami-5727b038`],
  [`eu-west-1`, `ami-ae6ce2d7`],
  [`eu-west-2`, `ami-825f47e6`],
  [`eu-west-3`, `ami-a22493df`],
  [`sa-east-1`, `ami-f76c2c9b`],
  [`us-east-1`, `ami-5d8dce27`],
  [`us-east-2`, `ami-ae95bdcb`],
  [`us-west-1`, `ami-0ce3e56c`],
  [`us-west-2`, `ami-5ef1693e`]
]

const simulate = false
const index = 0
const image = images[index]

updateImage(image)

