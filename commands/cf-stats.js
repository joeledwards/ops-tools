module.exports = {
  command: 'cf-stats',
  desc: 'CloudFlare stats',
  builder,
  handler
}

function builder () {
}

const ONE_HOUR = 60 * 60 * 1000
const CF_API_URL = 'https://api.cloudflare.com/client/v4'
const ZONE_ID = '57aebc5dc4eced6cea17c89ce8393d84'

function handler () {
  const c = require('@buzuli/color')
  const buzJson = require('@buzuli/json')

  const axios = require('axios')
  const moment = require('moment')
  const qs = require('qs')
  const r = require('ramda')

  listZones()
  .then(async zones => {
    try {
      const allStats = {}

      for (zoneId in zones) {
        const zone = zones[zoneId]
        console.log(`${c.blue(zone.name)} [${c.yellow(zone.id)}]:`)

        const stats = await getStats(zoneId)
        allStats[zoneId] = stats
        console.log(`  status:`)
        formatCounts(stats, 'http_status').forEach(p => console.log(`  ${p}`))
        console.log(`  content-type:`)
        formatCounts(stats, 'content_type').forEach(p => console.log(`  ${p}`))
        console.log(`  ssl:`)
        formatCounts(stats, 'ssl').forEach(p => console.log(`  ${p}`))
      }
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  }, error => {
    console.error(error)
    process.exit(1)
  })

  function formatCounts(info, category) {
    const rq = info.requests[category]
    const bw = info.bandwidth[category] || {}

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
      r.map(([key, {requests, bandwidth}]) => {
        const pad = ' '.repeat(maxKeyLength - key.length)
        return `${pad}${c.green(key)} : ${c.orange(requests)}` +
          (bandwidth ? ` (${bandwidth.toLocaleString()} b)` : '')
      }),
      r.sortBy(([k, v]) => k),
      r.toPairs
    )(pairs)
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

  async function getStats (zoneId, all = false) {
    const now = Date.now()
    const since = new Date(now - ONE_HOUR).toISOString().split('.')[0] + 'Z'
    const continuous = true

    const zoneStats = await cfApiCall(
      `/zones/${zoneId}/analytics/dashboard`,
      {since, continuous}
    ) 

    //console.log(buzJson(zoneStats))

    const {
      query: {
        time_delta: timeDelta
      },
      result: {
        timeseries
      },
      totals
    } = zoneStats

    if (all) {
      totals
    } else {
      return r.compose(
        r.last,
        r.sortBy(({until}) => moment(until))
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
