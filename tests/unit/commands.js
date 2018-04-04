const child = require('child_process')
const durations = require('durations')
const fs = require('fs')
const r = require('ramda')
const tap = require('tap')

function sw () {
  return durations.stopwatch().start()
}

function exec (command) {
  return new Promise((resolve, reject) => {
    child.exec(command, (error, stdout, stderr) => {
      const {code = 0, signal, message} = error || {}
      resolve({code, signal, message, stdout, stderr})
    })
  })
}

function listDir (dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (error, files) => {
      if (error) {
        reject(error)
      } else {
        resolve(files)
      }
    })
  })
}

function testCmd (t, cmd, {status = 0} = {}) {
  return new Promise(async (resolve, reject) => {
    const watch = sw()
    const outcome = await exec(cmd)
    const {code, stdout, stderr} = outcome
    t.ok(watch.duration().millis() < 1000, `[${cmd}] should execute in less than 1 second`)
    t.equal(code, status, `[${cmd}] should exit with ${status} status code`)
    if (status === 0) {
      t.ok(stdout.length > 0, `[${cmd}] stdout should be populated`)
      t.ok(stderr.length === 0, `[${cmd}] stderr should be empty`)
    } else {
      t.ok(stderr.length > 0, `[${cmd}] stderr should be populated`)
    }
    resolve(outcome)
  })
}

tap.test(async t => {
  const bin = './bin/ops.js'
  const cmdDir = './commands'
  const {stdout: helpOut} = await testCmd(t, `${bin} --help`)
  const {stderr: plainErr, stdout: plainOut} = await testCmd(t, bin, {status: 1})
  t.ok(plainOut.length === 0, 'no output to stdout for unexpected help')
  t.ok(r.startsWith(helpOut)(plainErr),
    'should display help when no command specified')

  const subCommands = (await listDir(cmdDir)).map(cmd => cmd.split('.')[0])

  for (const cmd of subCommands) {
    await testCmd(t, `${bin} ${cmd} --help`)
  }

  t.done()
})
