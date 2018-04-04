module.exports = {
  command: 'docker-tags <image>',
  desc: 'fetch the list of tags for an image from docker hub',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('raw', {
      type: 'boolean',

      default: 'false',
      alias: ['r']
    })
}

async function handler ({image, raw}) {
  const {green, orange, yellow} = require('@buzuli/color')
  const axios = require('axios')
  const oboe = require('oboe')

  const url = `https://registry.hub.docker.com/v1/repositories/${image}/tags`

  if (!raw) {
    console.info(`URL: ${green(url)}`)
  }

  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream'
  })

  let tagCount = 0
  oboe(response.data)
    .node('!.*.name', name => {
      tagCount++
      console.log(raw ? name : yellow(name))
      return oboe.drop()
    })
    .done(() => {
      if (!raw) {
        console.info(`Found ${orange(tagCount)} tags.`)
      }
    })
}
