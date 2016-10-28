import create from '@most/create'

export default function callBackToStream () {
  let addWrap = function () {}

  function callbackTest (externalData) {
    addWrap(externalData)
  }
  let callback = callbackTest
  const stream = create((add, end, error) => {
    addWrap = add
  })
  return {stream, callback}
}
