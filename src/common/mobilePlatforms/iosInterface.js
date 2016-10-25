function IOSCallback (data) {
  let formated = ''
  const urlScheme = 'yoururlscheme'
  const host = 'somehost'
  Object.keys(data).forEach(k => {
    formated += `${k}=${data[k]}`
  })
  const location = `${urlScheme}://${host}?${formated}`
  console.log('here', location)
  window.location = location
}
function callNativeApp (data) {
  try {
    webkit.messageHandlers.callbackHandler.postMessage(data)
  } catch(err) {
    console.log('Not native')
  }
}

export function onLoadModelError (error) {
  callNativeApp({modelLoadERROR: error})
}

export function onLoadModelSuccess (model) {
  callNativeApp({modelLoaded: true})
}

export function onBoundsExceeded () {
  callNativeApp({boundsExceeded: true})
}
