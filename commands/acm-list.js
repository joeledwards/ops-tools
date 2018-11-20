module.exports = {
  command: 'acm-list',
  desc: 'list all ACM certificates',
  builder,
  handler
}

function builder (yargs) {
}

async function handler (args) {
  try {
    const c = require('@buzuli/color')
    const r = require('ramda')
    const acm = require('../lib/aws').acm()
    const buzJson = require('@buzuli/json')

    const certs = await acm.listCerts()
    const summary = r.compose(
      r.join('\n'),
      r.map(({arn, name}) => `${c.yellow(arn)} : ${c.blue(name)}`),
      r.map(({CertificateArn: arn, DomainName: name}) => ({arn, name}))
    )(certs.CertificateSummaryList)

    console.info(summary)
  } catch (error) {
    console.error(`Error listing certificates: ${error}`)
  }
}
