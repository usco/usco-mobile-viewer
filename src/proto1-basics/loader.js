import XhrStream from 'xhr-stream'
import makeStlStream from 'usco-stl-parser'
//import http from 'stream-http'
import fetchStream from 'fetch-readablestream'
import concat from 'concat-stream'

const Duplex = require('stream').Duplex
const Readable = require('stream').Readable

export default function loadTest(uri){
  console.log('trying to load')
  const xhr = new XMLHttpRequest()
  //xhr.responseType = 'arraybuffer'
  xhr.open('GET', uri, true)

  const xhrStream = new XhrStream( xhr )

  const stlStream = makeStlStream({useWorker: true})

  const foo = new Duplex({
    read(){
      console.log('reading')
    },
    write(chunk, encoding, next){
      console.log('chunk', chunk)
      next(null, Buffer(chunk))
    }
  })

  try{
  //const xhrStream2 = http.get(uri)
/*  http.get(uri, function onResponse(response) {
    response.pipe(foo)
})*/
  //xhrStream2.pipe(foo)
  console.log(fetchStream(uri))//.pipe(foo)
}catch(error){
  console.log('error',error)
}

  return (xhrStream
    .pipe(stlStream))

}


/*  var oReq = new XMLHttpRequest()
  oReq.responseType = 'arraybuffer'
  oReq.addEventListener('load', reqListener)
  oReq.open('GET', testFile)
  oReq.send()*/
