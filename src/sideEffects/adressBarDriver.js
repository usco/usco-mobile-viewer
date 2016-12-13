import create from '@most/create'

// this is a pseudo cycle.js driver
const adressBarDriver = create((add, end, error) => {
  const url = window.location.href

  function getParam (name, url) {
    if (!url) url = location.href
    name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]')
    var regexS = '[\\?&]' + name + '=([^&#]*)'
    var regex = new RegExp(regexS)
    var results = regex.exec(url)
    return results == null ? null : results[1]
  }
  const params = getParam('modelUrl', url)
  add(params)
})

export default adressBarDriver
