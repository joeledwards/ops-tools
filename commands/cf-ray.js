module.exports = {
  command: 'cf-ray <ray-id>',
  desc: 'fetch the Cloudflare log record for the supplied Ray ID',
  builder,
  handler
}

const axios = require('axios')
const buzJson = require('@buzuli/json')

function builder (yargs) {
  yargs
    .env('CLOUDFLARE')
    .positional('ray-id', {
      type: 'string',
      desc: 'the Ray ID to fetch from the Cloudflare Logpull API'
    })
    .option('email', {
      type: 'string',
      desc: 'the e-mail address associated with your Cloudflare account',
      alias: 'e'
    })
    .option('api-key', {
      type: 'string',
      desc: 'the API key associated with your Cloudflare account',
      alias: ['k', 'token', 't']
    })
    .option('zone', {
      type: 'string',
      dsec: 'the ID of the Cloudflare zone from which you are fetching the ray log'
    })
}

async function handler (args) {
  const {
    rayId,
    email,
    apiKey,
    zone
  } = args

  try {
    const logFields = await getLogFields(args)
    const url = `https://api.cloudflare.com/client/v4/zones/${zone}/logs/rayids/${rayId}?fields=${logFields}`

    const { status, data } = await axios.get(url, {
      headers: {
        Accept: 'application/json',
        'X-Auth-Email': email,
        'X-Auth-Key': apiKey
      }
    })

    console.info(`[${status}] ${buzJson(data)}`)
  } catch (error) {
    console.error(error)
    console.error('Error happened ^')
  }
}

async function getLogFields (args) {
  const {
    email,
    apiKey,
    zone
  } = args

  const url = `https://api.cloudflare.com/client/v4/zones/${zone}/logs/received/fields`

  const {
    data: fields
  } = await axios.get(url, {
    headers: {
      Accept: 'application/json',
      'X-Auth-Email': email,
      'X-Auth-Key': apiKey
    }
  })

  return Object.keys(fields)
}
