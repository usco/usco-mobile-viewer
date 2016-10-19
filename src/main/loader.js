// import XhrStream from 'xhr-stream'
import makeStlStream from 'usco-stl-parser'
// require("web-streams-polyfill/dist/polyfill.min.js")
// import 'whatwg-fetch'
// import { ReadableStream } from "web-streams-polyfill"
import fetchStream from 'fetch-readablestream'

const Duplex = require('stream').Duplex
const Readable = require('stream').Readable

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
  console.log(`loading model from: ${uri}`)
  /*const xhr = new XMLHttpRequest()
  // xhr.responseType = 'arraybuffer'
  xhr.open('GET', uri, true)
  const xhrStream = new XhrStream(xhr)*/
  const stlStream = makeStlStream({useWorker: true})

  const foo = new Duplex({
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
      const finish = () => {
        self.emit('finish')}
      const end = () => {
        self.emit('end')}
      const push = (data) => self.push(data)
      // console.log('push', push)
      // console.log('end', end)
      // console.log('finish', finish)
      const process = (data) => {
        const { value, done } = data
        // console.log('SOURCE chunk', data , value, done)
        if (done) {
          // finish()
          end()
        } else {
          push(Buffer(value))
          return reader.read().then(process)
        }
      }

      function streams () {
        fetchStream(uri).then(function (response) {
          reader = response.body.getReader()
          reader.read().then(process)
        }).catch(e => console.log('error reading', e))
      }
      function noStreams () {
        function onLoad (e) {
          // console.log('done', e)
          let value = e.target.response
          // console.log('SOURCE chunk',value, value[0])
          push(Buffer(value))
          setTimeout(end, 0.0001) // don't call end directly !
        }

        const xhr = new XMLHttpRequest()
        xhr.responseType = 'arraybuffer'
        xhr.addEventListener('load', onLoad)
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
  return new HttpSourceStream(uri).pipe(makeStlStream({useWorker: true}))
}
