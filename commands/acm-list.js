module.exports = {
  command: 'acm-list',
  desc: 'list all ACM certificates',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('json', {
      desc: 'output the raw JSON',
      alias: 'j'
    })
}

async function handler (args) {
  try {
    const c = require('@buzuli/color')
    const r = require('ramda')
    const acm = require('../lib/aws').acm()
    const buzJson = require('@buzuli/json')

    const {
      json
    } = args

    const certs = await acm.listCerts()

    if (json) {
      console.info(buzJson(certs))
    } else {
      const summary = r.compose(
        r.join('\n'),
        r.map(({ arn, name }) => `${c.yellow(arn)} : ${c.blue(name)}`),
        r.map(({ CertificateArn: arn, DomainName: name }) => ({ arn, name }))
      )(certs.CertificateSummaryList)
      console.info(summary)
    }
  } catch (error) {
    console.error(`Error listing certificates: ${error}`)
  }
}
