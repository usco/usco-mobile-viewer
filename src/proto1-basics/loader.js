import XhrStream from 'xhr-stream'
import makeStlStream from 'usco-stl-parser'
import concat from 'concat-stream'

const Duplex = require('stream').Duplex

export default function loadTest(){
  console.log('trying to load')
  const xhr = new XMLHttpRequest()
  xhr.open('GET', '/data/cube.stl', true)
  //oReq.responseType = "arraybuffer"

  const xhrStream = new XhrStream( xhr )
  const stlStream = makeStlStream({useWorker: false})

  const foo = new Duplex({
    read(){
      console.log('reading')
    },
    write(chunk, encoding, next){
      console.log('chunk', chunk)
      next(null, Buffer(chunk))
    }
  })

  return (xhrStream
    .pipe(stlStream))

}
