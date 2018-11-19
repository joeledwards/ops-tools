const newAws = require('./aws')
const promised = require('./promised')

module.exports = require('mem')(newArn)

function newArn (options) {
  const aws = newAws(options)
  const acm = new aws.api.ACM(aws.config)

  return {
    certInfo: certInfo(acm),
    importCert: importCert(acm),
    listCerts: listCerts(acm),
    aws,
    api: acm
  }
}

function importCert (acm) {
  return promised(acm.importCertificate.bind(acm))
}

function listCerts (acm) {
  return promised(acm.listCertificates.bind(acm))
}

function certInfo (acm) {
  return promised(acm.describeCertificate.bind(acm))
}
