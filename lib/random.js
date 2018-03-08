const crypto = require('crypto')

module.exports = {
  hex: len => {
    return new Promise((resolve, reject) =>
      crypto.randomBytes(
        Math.ceil(len / 2),
        (error, buffer) => error ? reject(error) : resolve(buffer)
      )
    )
    .then(buffer =>
      buffer.toString('hex').slice(0, len)
    )
  }
}
