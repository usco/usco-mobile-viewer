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

function callNativeApp (path, payload) {
  try {
    console.log('calling native app', path)
    window.webkit.messageHandlers[path].postMessage(payload)
  } catch(err) {
    console.log('Not native')
  }
}

export function makeIosInterface () {
  return {
    onLoadModelError: () => callNativeApp('loadModel', 'error'),
    onLoadModelSuccess: () => callNativeApp('loadModel', 'success'),
    onBoundsExceeded: () => callNativeApp('objectBounds', 'exceeded'),
    onViewerReady: () => callNativeApp('viewer', 'ready'),
    onMachineParamsError: () => callNativeApp('machineParams', 'error'),
    onMachineParamsSuccess:() => callNativeApp('machineParams','success')
  }
}
