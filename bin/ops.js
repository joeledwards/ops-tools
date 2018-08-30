#!/usr/bin/env node
const yargs = require('yargs')

function updateCheck () {
  const updateNotifier = require('update-notifier')
  const pkg = require('../package.json')
  const notifier = updateNotifier({pkg, updateCheckInterval: 3600000})

  if (notifier.update) {
    notifier.notify()
  }
}

function run () {
  return yargs
    .exitProcess(false)
    .commandDir('../commands')
    .demandCommand()
    .strict() // CAUTION: do not use hyphens in positional args
    .fail(() => {
      yargs.showHelp()

      // only perform the update check when showing help
      updateCheck()

      process.exit(1)
    })
    .argv
}

run()
