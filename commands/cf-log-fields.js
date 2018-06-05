module.exports = {
  command: 'cf-log-fields',
  desc: 'CloudFlare log fields',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('quiet', {
      type: 'boolean',
      desc: 'only show the field names (no descriptions)',
      default: false,
      alias: ['q']
    })
    .option('zone', {
      type: 'string',
      desc: 'the zone for which stats should be pulled (defaults to all zones)',
      alias: ['z']
    })
}

const CF_API_URL = 'https://api.cloudflare.com/client/v4'

function handler ({quiet, zone}) {
  const c = require('@buzuli/color')
  const buzJson = require('@buzuli/json')
  const cfZone = zone || process.env.CLOUDFLARE_ZONE

  const axios = require('axios')
  const moment = require('moment')
  const qs = require('qs')
  const r = require('ramda')

  if (cfZone) {
    getZoneInfo(cfZone)
      .then(async ({name}) => {
        try {
          await summarizeZoneStats({id: cfZone, name})
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

  async function summarizeZoneStats ({id, name = 'unknown'}) {
    console.log(`${c.blue(name)} [${c.yellow(id)}]:`)

    const fields = await cfApiCall(`/zones/${id}/logs/received/fields`)

    if (quiet) {
      console.log(buzJson(Object.keys(fields)))
    } else {
      console.log(buzJson(fields))
    }
  }

  async function getZoneInfo (zoneId) {
    const {result: zone} = await cfApiCall(`/zones/${zoneId}`)

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

    const {result: zones} = await cfApiCall('/zones', {
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

    const email = process.env.CLOUDFLARE_EMAIL
    const key = process.env.CLOUDFLARE_API_KEY
    const headers = {
      'X-Auth-Email': email,
      'X-Auth-Key': key,
      'Content-Type': 'application/json'
    }

    return axios({
      url,
      headers,
      validateStatus: () => true
    })
      .then(({status, data, request: {method, path}}) => {
        if (status === 200) {
          return data
        } else {
          console.error(`[${c.yellow(status)}] API error:\n${c.green(method)} ${c.blue(path)}\n${buzJson(data)}`)
          throw Error(`API error [${status}]`)
        }
      })
  }
}
