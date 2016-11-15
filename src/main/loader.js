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
  // console.log(`loading model from: ${uri}`)
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

      this.readyData
      this.lenToSend = undefined

      function noStreams () {
        function onLoad (e) {
          console.log('onload', e.target.response)
          let value = Buffer(e.target.response)
          self.lenToSend = value.byteLength
          self.readyData = value

          push(value)
          push(null) // DO NOT fire some event, this way value => null are
          //handled in the correct order
        }

        function onError (e) {
          emitError(e)
        }

        const xhr = new XMLHttpRequest()
        xhr.responseType = 'arraybuffer'
        xhr.addEventListener('load', onLoad.bind(this))
        xhr.addEventListener('error', onError)
        xhr.open('GET', uri, true)
        xhr.send()
      }

      if (supportsStreaming()) {
        this.streamMode = true
        streams()
      } else {
        this.streamMode = false
        noStreams()
      }
    }
    _read (size) {
      /*console.log('_read', size, this.lenToSend, this)
      // this.push(this.readyData)
      // setTimeout(this.end, 1,true) // don't call end directly !
      let ready = true
      if (this.streamMode) {
        return
      }
      while(ready) {
        if (size && this.lenToSend !== undefined && this.lenToSend > 0) {
          size = Math.min(size, this.readyData.length)
          const workChunk = this.readyData
          const chunk = workChunk.slice(0, size)
          ready = this.push(chunk)
          this.lenToSend -= size // this.lenToSend//size
          this.readyData = workChunk.slice(size)
          console.log('sent', chunk)
        } else {
          ready = false
        }
        console.log('here')
        if (this.lenToSend !== undefined && this.lenToSend <= 0) {
          console.log('done')
          ready = false
          // this.emit('end')
          setTimeout(this.end, 1, true) // don't call end directly !
        }
      }*/
    // signal the source that it can start again
    }
  }
  // return HttpSourceStream(uri).pipe(makeStlStream({useWorker: true}))
  return create((add, end, error) => {
    function streamErrorHandler (_error) {
      error(_error)
    }

    new HttpSourceStream(uri)
      .on('error', streamErrorHandler)
      .pipe(makeStlStream({useWorker: true}))
      .on('error', streamErrorHandler)
      .pipe(concatStream(data => add(data)))
      .on('error', streamErrorHandler)
  })
}
