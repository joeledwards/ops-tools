const url = require('url')

module.exports = {
  base,
  coerce,
  resolve: url.resolve.bind(url)
}

function coerce (uri) {
  let parts = url.parse(uri)

  if (!parts.host && !parts.protocol && parts.path) {
    const assumeSecure = !parts.path.match(/^\d{1,3}(?:[.]\d{1,3}){3}$/) && !parts.path.match(/^[^.]+$/)
    parts = url.parse(`${assumeSecure ? 'https' : 'http'}://${uri}`)
  }

  const {
    protocol,
    auth,
    host,
    port,
    path
  } = parts

  const protoStr = protocol || 'http:'
  const authStr = auth ? `${auth}@` : ''
  const portStr = port ? `:${port}` : ''
  const pathStr = path ? `${path}` : ''

  return `${protoStr}//${authStr}${host}${portStr}${pathStr}`
}

function base (uri) {
  const parts = url.parse(uri)

  const {
    protocol,
    auth,
    host,
    port,
    pathname
  } = parts

  const protoStr = protocol || 'http:'
  const authStr = auth ? `${auth}@` : ''
  const portStr = port ? `:${port}` : ''
  const pathStr = pathname ? `${pathname}` : ''

  return `${protoStr}//${authStr}${host}${portStr}${pathStr}`
}
