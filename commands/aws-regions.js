module.exports = {
  command: 'aws-regions',
  describe: 'List out the AWS regions',
  handler
}

function handler () {
  const c = require('@buzuli/color')
  const ec2 = require('../lib/aws').ec2()

  ec2.listRegions()
    .then(({Regions}) => {
      const regions = Regions.map(({Endpoint: endpoint, RegionName: name}) => {
        return {endpoint, name}
      })

      regions.sort((a, b) => a.name.localeCompare(b.name))

      const maxNameLen = regions
        .map(({name}) => name.length)
        .reduce((a, b) => Math.max(a, b))

      const summary = regions.map(({name, endpoint}) => {
        const pad = '-'.repeat(maxNameLen - name.length + 3)
        return `${c.yellow(name)} ${pad} ${c.blue(endpoint)}`
      }).join('\n')

      console.log(summary)
    })
    .catch(error => {
      console.error(error)
    })
}
