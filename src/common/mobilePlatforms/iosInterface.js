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
    console.log('calling native app')
    window.webkit.messageHandlers.callbackHandler.postMessage('data')
  } catch(err) {
    console.log('Not native')
  }
}

export function onLoadModelError (error) {
  try {
    window.webkit.messageHandlers.loadModel.postMessage('error')
  } catch(err) {console.log('Not native onLoadModelError')}
// callNativeApp({modelLoadERROR: error})
}

export function onLoadModelSuccess (model) {
  try {
    window.webkit.messageHandlers.loadModel.postMessage('success')
  } catch(err) {console.log('Not native onLoadModelSuccess')}
// callNativeApp({modelLoaded: true})
}

export function onBoundsExceeded () {
  try {
    window.webkit.messageHandlers.objectBounds.postMessage('exceeded')
  } catch(err) {console.log('Not native onBoundsExceeded')}
// callNativeApp({boundsExceeded: true})
}

export function onViewerReady () {
  try {
    window.webkit.messageHandlers.viewer.postMessage('ready')
  } catch(err) {console.log('Not native onViewerReady')}
// callNativeApp({boundsExceeded: true})
}
