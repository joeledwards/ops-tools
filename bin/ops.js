#!/usr/bin/env node
const yargs = require('yargs')

function run () {
  return yargs
  .commandDir('../commands')
  .argv
}

run()
