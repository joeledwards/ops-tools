module.exports = {
  command: 'cf-stats',
  desc: 'CloudFlare stats',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('full-interval', {
      type: 'boolean',
      desc: 'get values from the full time interval',
      default: false,
      alias: ['full', 'f']
    })
    .option('sort-by-byte-count', {
      type: 'boolean',
      desc: 'order by byte count, descending [overrides -b]',
      default: false,
      alias: ['bc', 'b']
    })
    .option('sort-by-request-count', {
      type: 'boolean',
      desc: 'order by request count, descending',
      default: false,
      alias: ['rc', 'r']
    })
    .option('zone', {
      type: 'string',
      desc: 'the zone for which stats should be pulled (defaults to all zones)',
      alias: ['z']
    })
}

const ONE_HOUR = 60 * 60 * 1000
const CF_API_URL = 'https://api.cloudflare.com/client/v4'

function handler ({ full, bc, rc, zone }) {
  const c = require('@buzuli/color')
  const buzJson = require('@buzuli/json')
  const cfZone = zone || process.env.CLOUDFLARE_ZONE

  const axios = require('axios')
  const moment = require('moment')
  const qs = require('qs')
  const r = require('ramda')

  const ordering = bc ? 'byte-count' : rc ? 'request-count' : null

  if (cfZone) {
    getZoneInfo(cfZone)
      .then(async ({ name }) => {
        try {
          await summarizeZoneStats({ id: cfZone, name })
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

  async function summarizeZoneStats ({ id, name = 'unknown' }) {
    console.log(`${c.blue(name)} [${c.yellow(id)}]:`)

    const stats = await getStats(id, full)

    console.log(`  status:`)
    formatCounts(stats, 'http_status', ordering, decorateStatusKey)
      .forEach(p => console.log(`  ${p}`))

    console.log()

    console.log(`  content-type:`)
    formatCounts(stats, 'content_type', ordering)
      .forEach(p => console.log(`  ${p}`))

    console.log()

    console.log(`  ssl:`)
    formatCounts(stats, 'ssl', ordering, decorateSslKey)
      .forEach(p => console.log(`  ${p}`))
  }

  function decorateStatusKey (key) {
    const status = parseInt(key) || 0
    return (
      (status >= 500)
        ? c.yellow
        : (status >= 400)
          ? c.red
          : (status >= 300)
            ? c.blue
            : (status >= 200)
              ? c.green
              : c.purple
    )(key)
  }

  function decorateSslKey (key) {
    return (key === 'encrypted' ? c.green : c.red)(key)
  }

  function formatCounts (info, category, ordering, keyDecorator) {
    const rq = info.requests[category]
    const bw = info.bandwidth[category] || {}
    const decorateKey = keyDecorator || (k => c.blue(k))

    const sortField = ([k, v]) => {
      if (ordering === 'byte-count' && v.bandwidth) { return Number(v.bandwidth) || 0 }

      if (ordering === 'request-count' && v.requests) { return Number(v.requests) || 0 }

      return Number(k) || k
    }

    const pairs = r.compose(
      r.mergeAll,
      r.fromPairs,
      r.map(key => [key, {
        requests: rq[key],
        bandwidth: bw[key]
      }]),
      r.keys
    )(rq)

    const maxKeyLength = r.compose(
      r.reduce(r.max, 0),
      r.map(k => k.length),
      r.keys
    )(pairs)

    return r.compose(
      r.map(([key, { requests, bandwidth }]) => {
        const pad = ' '.repeat(maxKeyLength - key.length)
        return `${pad}${decorateKey(key)} : ${c.orange(requests)}` +
          (bandwidth ? ` (${bandwidth.toLocaleString()} b)` : '')
      }),
      // r.sortBy(([k, v]) => k),
      r.sortBy(sortField),
      r.toPairs
    )(pairs)
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

  async function getStats (zoneId, full = false) {
    const now = Date.now()
    const since = new Date(now - ONE_HOUR).toISOString().split('.')[0] + 'Z'
    const continuous = true

    const zoneStats = await cfApiCall(
      `/zones/${zoneId}/analytics/dashboard`,
      { since, continuous }
    )

    const {
      query: {
        time_delta: timeDelta
      },
      result: {
        timeseries,
        totals
      }
    } = zoneStats

    zoneStats.time_delta = timeDelta

    if (full) {
      return totals
    } else {
      return r.compose(
        r.last,
        r.sortBy(({ until }) => moment(until))
      )(timeseries)
    }
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
