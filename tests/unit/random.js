const random = require('../../lib/random')
const tap = require('tap')

tap.test('should allow an even number of hex characters', t => {
  const txt = random.hex(8)
  t.equal(txt.length, 8)
  t.match(txt, /[0-9a-f]{8}/)
  t.done()
})

tap.test('should allow an odd number of hex characters', t => {
  const txt = random.hex(7)
  t.equal(txt.length, 7)
  t.match(txt, /[0-9a-f]{7}/)
  t.done()
})

tap.test('should supply empty string when zero characters requested', t => {
  const txt = random.hex(0)
  t.equal(txt, '')
  t.done()
})
