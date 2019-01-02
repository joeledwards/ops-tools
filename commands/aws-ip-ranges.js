module.exports = {
  command: 'aws-ip-ranges',
  desc: 'IP ranges owned by AWS',
  builder,
  handler
}

const regions = [
  { name: 'US East (Ohio)', code: 'us-east-2' },
  { name: 'US East (N. Virginia)', code: 'us-east-1' },
  { name: 'US West (N. California)', code: 'us-west-1' },
  { name: 'US West (Oregon)', code: 'us-west-2' },
  { name: 'Asia Pacific (Mumbai)', code: 'ap-south-1' },
  { name: 'Asia Pacific (Osaka-Local)', code: 'ap-northeast-3' },
  { name: 'Asia Pacific (Seoul)', code: 'ap-northeast-2' },
  { name: 'Asia Pacific (Singapore)', code: 'ap-southeast-1' },
  { name: 'Asia Pacific (Sydney)', code: 'ap-southeast-2' },
  { name: 'Asia Pacific (Tokyo)', code: 'ap-northeast-1' },
  { name: 'Canada (Central)', code: 'ca-central-1' },
  { name: 'China (Beijing)', code: 'cn-north-1' },
  { name: 'China (Ningxia)', code: 'cn-northwest-1' },
  { name: 'EU (Frankfurt)', code: 'eu-central-1' },
  { name: 'EU (Ireland)', code: 'eu-west-1' },
  { name: 'EU (London)', code: 'eu-west-2' },
  { name: 'EU (Paris)', code: 'eu-west-3' },
  { name: 'EU (Stockholm)', code: 'eu-north-1' },
  { name: 'South America (São Paulo)', code: 'sa-east-1' },
  { name: 'AWS GovCloud (US-East)', code: 'us-gov-east-1' },
  { name: 'AWS GovCloud (US)', code: 'us-gov-west-1' },
  { name: 'me-south-1', code: 'me-south-1' }
]

const regionNames = new Map(regions.map(r => [r.code, r.name]))

function builder (yargs) {
  yargs
    .option('ip-regex', {
      type: 'string',
      desc: 'filter ip range prefix via regex',
      alias: 'i'
    })
    .option('region', {
      type: 'string',
      desc: 'filter by region',
      alias: 'r',
      choices: ['global', ...(regions.map(r => r.code))]
    })
    .option('region-regex', {
      type: 'string',
      desc: 'filter regions (code and name) via regex',
      alias: 'R',
      conflicts: ['region']
    })
    .option('service', {
      type: 'string',
      desc: 'filter by service name',
      alias: 's'
    })
    .option('service-regex', {
      type: 'string',
      desc: 'filter services via regex',
      alias: 'S',
      conflicts: ['service']
    })
}

async function handler (args) {
  const c = require('@buzuli/color')
  const r = require('ramda')
  const buzHttp = require('@buzuli/http')
  const buzJson = require('@buzuli/json')
  const axios = require('axios')

  try {
    const {
      ipRegex,
      region,
      regionRegex,
      service,
      serviceRegex
    } = args

    let ipFilter, regionFilter, serviceFilter

    // IP filtering
    if (ipRegex) {
      const regex = new RegExp(ipRegex, 'i')
      ipFilter = ({ ipv6_prefix: v6Prefix, ip_prefix: prefix }) => {
        return (prefix && prefix.match(regex)) || (v6Prefix && v6Prefix.match(regex))
      }
    }

    // Region filtering
    if (region) {
      regionFilter = ({ region: ipRegion }) => {
        return ipRegion === 'region'
      }
    } else if (regionRegex) {
      const regex = new RegExp(regionRegex, 'i')
      regionFilter = ({ region: ipRegion }) => {
        const name = regionNames.get(ipRegion)
        return ipRegion.match(regex) || (name && name.match(regex))
      }
    }

    // Service filtering
    if (service) {
      serviceFilter = ({ service: ipService }) => {
        return ipService === service
      }
    } else if (serviceRegex) {
      const regex = new RegExp(serviceRegex, 'i')
      serviceFilter = ({ service: ipService }) => {
        return ipService.match(regex)
      }
    }

    // Applies all filters
    const filterRecords = records => {
      return r.compose(
        r.filter(r => ipFilter ? ipFilter(r) : true),
        r.filter(r => regionFilter ? regionFilter(r) : true),
        r.filter(r => serviceFilter ? serviceFilter(r) : true)
      )(records)
    }

    // Formats the records
    const formatRecords = records => {
      return buzJson(records)
    }

    const url = 'https://ip-ranges.amazonaws.com/ip-ranges.json'
    const { status, data } = await axios.get(url, { validateStatus: () => true })

    if (status !== 200) {
      const [code, message] = buzHttp.status.color(status)
      if (data) {
        console.error(data)
      }
      console.error(`[${code}] ${message}`)
      process.exit(1)
    } else {
      // Also contains fields `createDate` and `syncToken`
      const { prefixes: v4Records, ipv6_prefixes: v6Records } = data
      console.info(formatRecords(filterRecords({ ...v4Records, ...v6Records })))
    }
  } catch (error) {
    console.error(c.red('Could not fetch AWS IP ranges:'), `${error}`)
    process.exit(1)
  }
}
