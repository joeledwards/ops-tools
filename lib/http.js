module.exports = {
  colorCode
}

const {red, yellow, green, blue, purple} = require('@buzuli/color')

function colorCode (status, text) {
  const color = (status > 499
    ? yellow
    : status > 399
    ? red
    : status > 299
    ? purple
    : status > 199
    ? green
    : blue
  )

  return text
    ? [color(status), color(text)]
    : color(status)
}
