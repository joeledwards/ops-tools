module.exports = {
  command: 'acm-import <pem-cert> <private-key>',
  desc: 'Imports a pem-format cert into ACM',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .positional('pem-cert', {
      type: 'string',
      desc: 'path to the pem-formatted cert on disk'
    })
    .positional('private-key', {
      type: 'string',
      desc: 'path to the private key on disk'
    })
    .option('cert-arn', {
      type: 'string',
      desc: 'the ARN of the cert if you are replacing an existing ACM entry',
      alias: 'arn'
    })
    .option('cert-chain', {
      type: 'string',
      desc: 'path to the the cert chain',
      alias: 'chain'
    })
    .option('json', {
      type: 'boolean',
      desc: 'output the raw JSON',
      alias: 'j'
    })
}

async function handler (args) {
  try {
    const c = require('@buzuli/color')
    const acm = require('../lib/aws').acm()
    const buzJson = require('@buzuli/json')

    const {
      certArn,
      certChain,
      json,
      pemCert,
      privateKey
    } = args

    const certData = await getData(pemCert)
    const keyData = await getData(privateKey)
    let chainData

    if (certChain) {
      chainData = await getData(certChain)
    }

    const options = {
      CertificateArn: certArn,
      Certificate: certData,
      PrivateKey: keyData,
      CertificateChain: chainData
    }

    const cert = await acm.importCert(options)

    if (json) {
      console.info(buzJson(cert))
    } else {
      const {
        CertificateArn: arn
      } = cert
      // TODO: lookup the ARN
      console.info(c.yellow(arn))
    }
  } catch (error) {
    console.error(`Could not import cert: ${error}`)
    process.exit(1)
  }
}

async function getData (path) {
  try {
    const data = await readFile(path)
    return data
  } catch (error) {
    console.error(`Error reading ${path} : ${error}`)
    process.exit(1)
  }
}

async function readFile (path) {
  return new Promise((resolve, reject) => {
    const fs = require('fs')
    fs.readFile(path, (error, data) => error ? reject(error) : resolve(data))
  })
}
