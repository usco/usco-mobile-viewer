let mobileCaller = {
  interfaceName: 'JAMDroid',

  call: function (method) {
    //console.log('method', method)
    if (eval('typeof ' + this.interfaceName) !== 'undefined') {
      new Function(this.interfaceName + '.' + method)()
    }
  }
}

export function makeAndroidInterface () {
  return {
    viewerReady: () => mobileCaller.call('onViewerReady()'),
    modelLoaded: (value) => mobileCaller.call(`onLoadModel(${value})`),
    machineParamsLoaded: (value) => mobileCaller.call(`onMachineParamsResult(${value})`),
    objectFitsPrintableVolume: (value) => mobileCaller.call(`objectFitsPrintableVolume(${value})`)
  }
}
