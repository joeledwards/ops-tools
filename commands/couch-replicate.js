module.exports = {
  command: 'couch-replicate <document> [dst-doc]',
  desc: 'replicate a document from one CouchDB to another, replacing (new _rev) if the document already exists',
  builder,
  handler
}

function builder (yargs) {
  yargs
    .positional('document', {
      type: 'string',
      desc: 'the id of the document which should be replicated from the source CouchDB'
    })
    .positional('dst-doc', {
      type: 'string',
      desc: 'the id of the document to create/replace in the destination CouchDB (the id of the source document will be used if this is not supplied)'
    })
    .option('src-couch', {
      type: 'string',
      desc: 'the URL of the CouchDB database from which the source document should be fetched',
      default: 'http://localhost:5984/test',
      alias: 'src'
    })
    .option('dst-couch', {
      type: 'string',
      desc: 'the URL of the CouchDB database to which the new/updated document should be written',
      default: 'http://localhost:5984/test',
      alias: 'dst'
    })
    .option('dry-run', {
      type: 'boolean',
      desc: 'do everything except actually updating the document',
      default: false,
      alias: 'dry'
    })
}

async function handler ({ document, dstDoc: dstName, srcCouch, dstCouch, dryRun }) {
  const c = require('@buzuli/color')
  const axios = require('axios')

  function encodeDocId (doc) {
    if (doc[0] === '@') {
      return `@${encodeDocId(doc.slice(1))}`
    } else {
      return encodeURIComponent(doc)
    }
  }

  const srcIdColor = id => c.yellow(id)
  const dstIdColor = id => c.green(id)
  const urlColor = url => c.blue(url)

  const srcDoc = document
  const dstDoc = dstName || document
  const srcDocId = encodeDocId(srcDoc)
  const dstDocId = encodeDocId(dstDoc)

  async function getSourceDoc () {
    try {
      console.info(`Fetching source document ${srcIdColor(srcDocId)} from ${urlColor(srcCouch)}/${srcIdColor(srcDocId)}`)
      const { data: doc, status } = await axios.get(`${srcCouch}/${srcDocId}`, {
        validateStatus: status => [200, 404].includes(status)
      })

      if (status === 200) {
        console.info(`Source document ${srcIdColor(srcDocId)} found [_rev:${srcIdColor(doc._rev)}].`)
      } else {
        throw new Error(`Document ${srcDoc} was not found in the source CouchDB`)
      }

      return doc
    } catch (error) {
    }
  }

  async function getDestinationDoc () {
    console.info(`Fetching destination document ${dstIdColor(dstDocId)} from ${urlColor(dstCouch)}/${dstIdColor(dstDocId)}`)
    const { data: doc, status } = await axios.get(`${dstCouch}/${dstDocId}`, {
      validateStatus: status => [200, 404].includes(status)
    })

    return (status === 200) ? doc : {}
  }

  async function getUpdatedDoc () {
    const updateDoc = await getSourceDoc()
    const { _rev: dstRevision } = await getDestinationDoc()
    let isNew = false

    if (dstRevision) {
      // If the revision was supplied we need to update.
      console.info(`Destination document ${dstIdColor(dstDoc)} [_rev:${dstIdColor(dstRevision)}] was found. Replacing its contents ...`)
      updateDoc._rev = dstRevision
    } else {
      // Otherwise we are writing new document.
      console.info(`Destination document ${dstIdColor(dstDoc)} was NOT found. Creating it ...`)
      isNew = true
      delete updateDoc._rev
    }

    return { updateDoc: JSON.stringify(updateDoc), isNew }
  }

  async function updateReplicateDoc () {
    const { updateDoc, isNew } = await getUpdatedDoc()

    if (dryRun) {
      console.info(`This is a dry run. Would have ${isNew ? 'created' : 'updated'} document ${dstIdColor(dstDoc)}`)
    } else {
      console.info(`${isNew ? 'Creating' : 'Updating'} document ${dstIdColor(dstDoc)}`)
      await axios.put(`${dstCouch}/${dstDocId}`, updateDoc)
    }
  }

  try {
    await updateReplicateDoc()
  } catch (error) {
    console.error(`Error updating document ${document} : ${error}`)
    process.exit(1)
  }
}
