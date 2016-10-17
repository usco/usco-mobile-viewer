import { parseSteps } from '../common/stlParser/parseHelpers'

const testFile = '/data/roman.stl' // roman.stl'

const parsedSTLStream1 = create((add, end, error) => {

  function reqListener (e) {
    const data = e.target.response
    let result = parseSteps(data)
    console.log('done parsing')
    add(result)
  }

  var oReq = new XMLHttpRequest()
  oReq.responseType = 'arraybuffer'
  oReq.addEventListener('load', reqListener)
  oReq.open('GET', testFile)
  oReq.send()
})


const parsedSTLStream = create((add, end, error) => {

  loadTest(testFile) // '/data/cube.stl'
    .pipe(concatStream(function (data) {
      console.log('loading & concatenating')
      add(data)
    }))
})
