//import XhrStream from 'xhr-stream'
import makeStlStream from 'usco-stl-parser'
//require("web-streams-polyfill/dist/polyfill.min.js")
//import 'whatwg-fetch'
//import { ReadableStream } from "web-streams-polyfill"
import fetchStream from 'fetch-readablestream'

const Duplex = require('stream').Duplex
const Readable = require('stream').Readable

export default function loadTest (uri) {
  console.log('trying to load')
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
      const finish = () => { self.emit('finish')}
      const end = () => { self.emit('end')}
      //const push = (data) => self.push(data)
      const push = this.push.bind(this)
      //const finish = this.emit.bind(this)

      //console.log('push', push)
      //console.log('end', end)
      //console.log('finish', finish)
      const process = (data) => {
        const { value, done } = data
        //console.log('SOURCE chunk', data , value, done)
        if (done) {
          finish()
          end()
        } else {
          push(Buffer(value))
          return reader.read().then(process)
        }
      }
      fetchStream(uri).then(function (response) {
        reader = response.body.getReader()
        reader.read().then(process)
      }).catch(e => console.log('error reading', e))
    // if (!this.push(chunk)){
    // }
    }
    _read (size) {
      //console.log('_read')
      //signal the source that it can start again
    }
  }
 return new HttpSourceStream(uri).pipe(makeStlStream({useWorker: true}))
}
