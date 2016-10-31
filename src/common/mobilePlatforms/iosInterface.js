function callNativeApp (path, payload) {
  try {
    //console.log('calling native app', path, payload)
    window.webkit.messageHandlers[path].postMessage(payload)
  } catch(err) {
    // console.log('Not native')
  }
}

export function makeIosInterface () {
  return {
    viewerReady: () => callNativeApp('viewer', 'ready'),
    modelLoaded: (value) => callNativeApp('loadModel', value ? 'success' : 'error'),
    machineParamsLoaded: (value) => callNativeApp('machineParams', value ? 'success' : 'error'),
    objectFitsPrintableVolume: (value) => callNativeApp('objectFitsPrintableVolume', `${value}`)
  }
}
