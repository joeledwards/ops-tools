module.exports = {
  command: 'cf-log-fields',
  desc: 'CloudFlare log fields',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .env('CLOUDFLARE')
    .option('quiet', {
      type: 'boolean',
      desc: 'only show the field names (no descriptions)',
      default: false,
      alias: ['q']
    })
    .option('email', {
      type: 'string',
      desc: 'the e-mail address associated with your Cloudflare account',
      alias: 'e'
    })
    .option('api-key', {
      type: 'string',
      desc: 'the API key associated with your Cloudflare account',
      alias: ['k', 'key', 'token', 't']
    })
    .option('zone', {
      type: 'string',
      desc: 'the Cloudflare zone for which stats should be pulled (defaults to all zones)',
      alias: ['z']
    })
}

const CF_API_URL = 'https://api.cloudflare.com/client/v4'

function handler (args) {
  const {
    quiet,
    email: cloudflareEmail,
    apiKey: cloudflareApiKey,
    zone: cloudflareZone
  } = args

  const c = require('@buzuli/color')
  const buzJson = require('@buzuli/json')

  const axios = require('axios')
  const qs = require('qs')
  const r = require('ramda')

  if (cloudflareZone) {
    getZoneInfo(cloudflareZone)
      .then(async ({ name }) => {
        try {
          await summarizeZoneStats({ id: cloudflareZone, name })
        } catch (error) {
          console.error(error)
          process.exit(1)
        }
      }, error => {
        console.error(error)
        process.exit(1)
      })
  } else {
    listZones()
      .then(async zones => {
        try {
          for (let zone in zones.values) {
            await summarizeZoneStats(zone)
          }
        } catch (error) {
          console.error(error)
          process.exit(1)
        }
      }, error => {
        console.error(error)
        process.exit(1)
      })
  }

  async function summarizeZoneStats ({ id: zoneId, name = 'unknown' }) {
    console.log(`${c.blue(name)} [${c.yellow(zoneId)}]:`)

    const fields = await cfApiCall(`/zones/${zoneId}/logs/received/fields`)

    if (quiet) {
      console.log(buzJson(Object.keys(fields)))
    } else {
      console.log(buzJson(fields))
    }
  }

  async function getZoneInfo (zoneId) {
    const { result: zone } = await cfApiCall(`/zones/${zoneId}`)

    return zone
  }

  async function listZones () {
    const name = 'npmjs.com'
    const status = 'active'
    const page = 1
    const perPage = 20
    const order = 'status'
    const direction = 'desc'
    const match = 'all'

    const { result: zones } = await cfApiCall('/zones', {
      name,
      status,
      page,
      per_page: perPage,
      order,
      direction,
      match
    })

    return r.compose(
      r.mergeAll,
      r.fromPairs,
      r.map(z => [z.id, z])
    )(zones)
  }

  function cfApiCall (path, query) {
    const queryString = query ? `?${qs.stringify(query)}` : ''
    const url = `${CF_API_URL}${path}${queryString}`

    const headers = {
      'X-Auth-Email': cloudflareEmail,
      'X-Auth-Key': cloudflareApiKey,
      'Content-Type': 'application/json'
    }

    return axios({
      url,
      headers,
      validateStatus: () => true
    })
      .then(({ status, data, request: { method, path } }) => {
        if (status === 200) {
          return data
        } else {
          console.error(`[${c.yellow(status)}] API error:\n${c.green(method)} ${c.blue(path)}\n${buzJson(data)}`)
          throw Error(`API error [${status}]`)
        }
      })
  }
}
