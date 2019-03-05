module.exports = {
  command: 'couch-rewrite <document> <path> [value]',
  desc: 'rewrite a single key within a CouchDB document',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .positional('document', {
      type: 'string',
      desc: 'the id of the document which should be rewritten'
    })
    .positional('path', {
      type: 'string',
      desc: 'the path which should be updated (e.g., "info.authors[0].name")'
    })
    .positional('value', {
      type: 'string',
      desc: 'the new value which should be written to the document at the key path'
    })
    .option('couch', {
      type: 'string',
      desc: 'the URL of the CouchDB database which should be updated',
      default: 'http://localhost:5984/test',
      alias: 'c'
    })
    .option('type', {
      type: 'string',
      desc: 'the JSON type to write (will agressively coerce if set to "auto")',
      choices: ['auto', 'bool', 'boolean', 'null', 'num', 'number', 'str', 'string', 'undef', 'undefined'],
      default: 'auto',
      alias: 't'
    })
    .option('force', {
      type: 'boolean',
      desc: 'write the new value even if no prior, non-structural value existed at the path',
      default: false,
      alias: 'F'
    })
    .option('dry-run', {
      type: 'boolean',
      desc: 'do everything except actually updating the document',
      default: false,
      alias: 'dry'
    })
    .option('debug', {
      type: 'boolean',
      desc: 'output additional debug info',
      default: false,
      alias: 'D'
    })
}

async function handler (args) {
  const {
    document: doc,
    path,
    value,
    couch,
    type,
    force,
    dryRun,
    debug
  } = args

  const _ = require('lodash')
  const c = require('@buzuli/color')
  const axios = require('axios')

  function encodeDocId (docId) {
    if (docId[0] === '@') {
      return `@${encodeDocId(docId.slice(1))}`
    } else {
      return encodeURIComponent(docId)
    }
  }

  const idColor = id => c.yellow(id)
  const pathColor = path => c.green(path)
  const updateColor = update => c.purple(update)
  const urlColor = url => c.blue(url)

  const docId = encodeDocId(doc)

  function getUpdate () {
    let updateType
    let updateValue

    switch (type) {
      case 'auto':
        switch (value) {
          case null:
          case undefined:
            updateValue = undefined
            updateType = 'auto:undefined'
            break
          case 'null':
            updateValue = null
            updateType = 'auto:null'
            break
          case 'true':
            updateValue = true
            updateType = 'auto:boolean:true'
            break
          case 'false':
            updateValue = false
            updateType = 'auto:boolean:false'
            break
          default:
            if (Number.isNaN(Number(value))) {
              updateValue = value
              updateType = `auto:string:${updateValue}`
            } else {
              updateValue = Number(value)
              updateType = `auto:number:${updateValue}`
            }
            break
        }
        break
      case 'bool':
      case 'boolean':
        if (value == null) {
          throw new Error('No value supplied for boolean type')
        }
        updateValue = Boolean(value)
        updateType = `boolean:${updateValue}`
        break
      case 'null':
        updateValue = null
        updateType = 'null'
        break
      case 'num':
      case 'number':
        if (value == null) {
          throw new Error('No value supplied for number type')
        }
        updateValue = Number(value)
        if (Number.isNaN(updateValue)) {
          throw new Error(`Value "${value}" is not numeric`)
        }
        updateType = `number:${updateValue}`
        break
      case 'str':
      case 'string':
        if (value == null) {
          throw new Error('No value supplied for string type')
        }
        updateValue = value
        updateType = `string:${updateValue}`
        break
      case 'undef':
      case 'undefined':
        updateValue = undefined
        updateType = `undefined`
        break
    }

    return { updateValue, updateType }
  }

  async function getDoc () {
    try {
      console.info(`Fetching document ${idColor(doc)} from ${urlColor(couch)}/${idColor(docId)}`)
      const { data, status } = await axios.get(`${couch}/${docId}`, {
        validateStatus: status => [200, 404].includes(status)
      })

      if (status === 200) {
        console.info(`Document ${idColor(doc)} found [_rev:${idColor(data._rev)}].`)
      } else {
        throw new Error(`Document ${idColor(doc)} was not found in CouchDB`)
      }

      return data
    } catch (error) {
      throw error
    }
  }

  async function getUpdatedDoc () {
    try {
      const { updateValue, updateType } = getUpdate()

      if (debug) {
        console.info(`Update => ${updateColor(updateType)}`)
      }

      const updatedDoc = await getDoc()
      const oldValue = _.get(updatedDoc, path)

      const noPriorValue = oldValue === undefined
      const priorIsObject = oldValue !== null && typeof oldValue === 'object'
      const hasExistingValue = !(noPriorValue || priorIsObject)

      if (!force && !hasExistingValue) {
        throw new Error(`Value not found at path ${pathColor(path)} in document ${idColor(doc)}`)
      }

      _.set(updatedDoc, path, updateValue)

      return JSON.stringify(updatedDoc)
    } catch (error) {
      throw error
    }
  }

  async function updateDoc () {
    try {
      const updatedDoc = await getUpdatedDoc()

      if (dryRun) {
        console.info(`This is a dry run. Would have updated document ${idColor(doc)}`)
      } else {
        console.info(`Updating document ${idColor(doc)}`)
        await axios.put(`${couch}/${docId}`, updatedDoc)
      }
    } catch (error) {
      console.error(`Error updating document ${idColor(doc)} : ${error}`)
      process.exit(1)
    }
  }

  try {
    if (debug) {
      console.info(`   couch: ${urlColor(couch)}`)
      console.info(`     doc: ${idColor(doc)}`)
      console.info(`    path: ${pathColor(path)}`)
      console.info(`   value: ${value}`)
      console.info(`    type: ${type}`)
      console.info(`   force: ${force}`)
      console.info(` dry-run: ${dryRun}`)
      console.info(`   debug: ${debug}`)
    }

    await updateDoc()

    console.info('Done.')
  } catch (error) {
    console.error(`Error updating document ${idColor(document)} : ${error}`)
    process.exit(1)
  }
}
