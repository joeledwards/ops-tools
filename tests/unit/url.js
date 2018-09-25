const tap = require('tap')
const url = require('../../lib/url')

tap.test('url.coerce should translate partial URLs as expected', async assert => {
  assert.same(url.coerce('host.tld'), 'https://host.tld/')
  assert.same(url.coerce('1.2.3'), 'https://1.2.3/')

  assert.same(url.coerce('1.2.3.4'), 'http://1.2.3.4/')
  assert.same(url.coerce('localhost'), 'http://localhost/')

  assert.same(url.coerce('localhost/cheese'), 'http://localhost/cheese')
  assert.same(url.coerce('localhost/cheese/'), 'http://localhost/cheese/')

  assert.same(url.coerce('me@localhost/cheese/'), 'http://me@localhost/cheese/')
  assert.same(url.coerce('me:please@localhost/cheese/'), 'me://please@localhost/cheese/')
  assert.same(url.coerce('http://me:please@localhost/cheese/'), 'http://me:please@localhost/cheese/')
})

tap.test('url.base should trim off everything after the path name', async assert => {
  assert.same(url.base('http://host.tld/path#fresh'), 'http://host.tld/path')
  assert.same(url.base('http://host.tld/path?l=1&s=true'), 'http://host.tld/path')
  assert.same(url.base('http://host.tld/path?l=1&s=true'), 'http://host.tld/path')
  assert.same(url.base('https://host.tld/path?l=1&s=true'), 'https://host.tld/path')
  assert.same(url.base('https://host.tld/path?l=1#fresh'), 'https://host.tld/path')
})

tap.test('url.resolve should build a url from path components', async assert => {
  assert.same(url.resolve('http://host.tld', 'path'), 'http://host.tld/path')
  assert.same(url.resolve('http://host.tld/', 'path'), 'http://host.tld/path')
  assert.same(url.resolve('http://host.tld', '/path'), 'http://host.tld/path')
  assert.same(url.resolve('http://host.tld/', '/path'), 'http://host.tld/path')
  assert.same(url.resolve('http://host.tld/', '/path', '/more'), 'http://host.tld/path')
  assert.same(url.resolve('http://host.tld', 'path', 'more'), 'http://host.tld/path')
})
