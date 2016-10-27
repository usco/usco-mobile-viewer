import makeStlStream from 'usco-stl-parser'
import { concatStream } from 'usco-stl-parser'
import fetchStream from 'fetch-readablestream'
// import XhrStream from 'xhr-stream'
// require("web-streams-polyfill/dist/polyfill.min.js")
// import 'whatwg-fetch'
// import { ReadableStream } from "web-streams-polyfill"

const Duplex = require('stream').Duplex
const Readable = require('stream').Readable

import create from '@most/create'

function supportsXhrResponseType (type) {
  try {
    var tmpXhr = new XMLHttpRequest()
    tmpXhr.responseType = type
    return tmpXhr.responseType === type
  } catch (e) { /* IE throws on setting responseType to an unsupported value */ }
  return false
}

function supportsStreaming () {
  let fetchSupport = (typeof Response !== 'undefined' && Response.prototype.hasOwnProperty('body'))
  let mozChunkSupport = (supportsXhrResponseType('moz-chunked-arraybuffer'))
  return fetchSupport || mozChunkSupport
}

export default function loadTest (uri) {
  //console.log(`loading model from: ${uri}`)
  const stlStream = makeStlStream({useWorker: true})

  const debugHelper = new Duplex({
    read() {
      console.log('reading')
    },
    write(chunk, encoding, next) {
      console.log('chunk in foo', chunk)
      next(null, Buffer(chunk))
    }
  })

  class HttpSourceStream extends Readable {
    constructor (uri) {
      super()

      let reader
      let self = this
      const finish = () => self.emit('finish')
      const end = () => self.emit('end')
      const push = (data) => self.push(data)
      const emitError = (error) => {
        self.emit('error', error)}

      const process = (data) => {
        const { value, done } = data
        // console.log('SOURCE chunk', data , value, done)
        if (done) {
          // finish()
          end()
        } else {
          push(Buffer(value))
          return reader.read().then(process).catch(e => emitError(e))
        }
      }

      function streams () {
        fetchStream(uri)
          .then(function (response) {
            reader = response.body.getReader()
            reader.read().then(process)
          }).catch(function (e) {
          emitError(e)
        })
      }

      function noStreams () {
        function onLoad (e) {
          let value = e.target.response
          push(Buffer(value))
          setTimeout(end, 0.0001) // don't call end directly !
        }

        function onError (e) {
          emitError(e)
        }

        const xhr = new XMLHttpRequest()
        xhr.responseType = 'arraybuffer'
        xhr.addEventListener('load', onLoad)
        xhr.addEventListener('error', onError)
        xhr.open('GET', uri, true)
        xhr.send()
      }

      if (supportsStreaming()) {
        streams()
      } else {
        noStreams()
      }
    // if (!this.push(chunk)){
    // }
    }
    _read (size) {
      // console.log('_read')
      // signal the source that it can start again
    }
  }
  // return HttpSourceStream(uri).pipe(makeStlStream({useWorker: true}))
  return create((add, end, error) => {
    function streamErrorHandler (_error) {
      // console.log('error in load stream')
      error(_error)
    }

    new HttpSourceStream(uri)
      .on('error', streamErrorHandler)
      .pipe(makeStlStream({useWorker: true}))
      .on('error', streamErrorHandler)
      .pipe(concatStream(data => add(data)))
      .on('error', streamErrorHandler)
  // FIXME: TODO: add error handling here
  })
}
