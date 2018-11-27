module.exports = {
  command: 'acm-info <arn>',
  desc: 'show details for a certificate',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .positional('arn', {
      type: 'string',
      desc: 'ARN of the certificate to detail'
    })
    .option('json', {
      type: 'boolean',
      desc: 'output the raw JSON',
      alias: 'j'
    })
}

async function handler (args) {
  const c = require('@buzuli/color')
  const acm = require('../lib/aws').acm()
  const buzJson = require('@buzuli/json')

  try {
    const {
      arn,
      json
    } = args

    const cert = await acm.certInfo({
      CertificateArn: arn
    })

    if (json) {
      console.info(buzJson(cert))
    } else {
      const {
        Certificate: {
          DomainName: name,
          FailureReason: failureReason,
          Issuer: issuer,
          KeyAlgorithm: algo,
          RevocationReason: revokeReason,
          Serial: serial,
          Status: status,
          Subject: subject,
          Type: type
        }
      } = cert
      console.info(`${c.yellow(arn)} : ${c.blue(name)}`)
      console.info(`                type : ${c.blue(type)}`)
      console.info(`              status : ${statusColor(status)}`)
      console.info(`             subject : ${c.blue(subject)}`)
      console.info(`              serial : ${c.yellow(serial)}`)
      console.info(`              issuer : ${c.green(issuer)}`)
      console.info(`       key algorithm : ${c.green(algo)}`)
      console.info(` signature algorithm : ${c.green(algo)}`)
      if (status === 'REVOKED') {
        console.info(`             revoked : ${c.red(revokeReason)}`)
      }
      if (status === 'FAILED') {
        console.info(`              failed : ${c.red(failureReason)}`)
      }
    }
  } catch (error) {
    console.error(`Could not detail cert: ${error}`)
    process.exit(1)
  }

  function statusColor (status) {
    switch (status) {
      case 'PENDING_VALIDATION':
        return c.blue(status)
      case 'ISSUED':
        return c.green(status)
      case 'INACTIVE':
        return c.yellow(status)
      default:
        return c.red(status)
    }
  }
}
