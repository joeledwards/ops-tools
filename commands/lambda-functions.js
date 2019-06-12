module.exports = {
  command: 'lambda-functions',
  desc: `list out an account's AWS Lambda functions`,
  builder,
  handler
}

function builder (yargs) {
  yargs
    .option('full', {
      type: 'boolean',
      desc: 'List all function output supplied by the Lambda API',
      default: false,
      alias: 'f'
    })
}

function handler ({ full }) {
  const c = require('@buzuli/color')
  const buzJson = require('@buzuli/json')
  const lambda = require('../lib/aws').lambda()
  const moment = require('moment')
  const r = require('ramda')

  const options = {}

  lambda.listFunctions(options)
    .then(result => {
      full ? formatFull(result) : formatSummary(result)
    })
    .catch(error => {
      console.error(error)
      console.error(c.red(
        `Error finding instances in ${c.yellow(lambda.aws.region)}: details above`
      ))
      process.exit(1)
    })

  function formatFull (result) {
    console.log(buzJson(result))
  }

  function formatSummary (result) {
    const maxNameLen = result.Functions
      .map(({ FunctionName }) => FunctionName.length)
      .reduce((a, b) => a > b ? a : b)

    const pad = name => ' '.repeat(maxNameLen - name.length)

    console.log(
      r.compose(
        r.join('\n'),
        r.map(({
          FunctionName: name,
          Description: desc,
          LastModified: updated
        }) => {
          const [cat, ...rest] = name.split('-').reverse()
          const catStr = c.orange(cat)
          const nameStr = c.yellow(rest.reverse().join('-'))
          const updateStr = c.grey(moment.utc(updated).format('YYYY-MM-DD HH:mm:ss'))

          return `${updateStr} ${pad(name)}${nameStr}-${catStr} : ${c.blue(desc)}`
        }),
        r.sortBy(({ FunctionName }) => FunctionName.split('-').reverse())
      )(result.Functions)
    )
  }
}
