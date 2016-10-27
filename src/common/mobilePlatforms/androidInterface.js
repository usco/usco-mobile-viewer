let mobileCaller = {
  interfaceName: 'JAMDroid',

  call: function (method) {
    if (eval('typeof ' + this.interfaceName) !== 'undefined') {
      new Function(this.interfaceName + '.' + method)()
    }
  }
}

export function makeAndroidInterface () {
  return {
    onLoadModelError: () => mobileCaller.call('onLoadModel(false)'),
    onLoadModelSuccess: () => mobileCaller.call('onLoadModel(true)'),
    onBoundsExceeded: () => mobileCaller.call('onBoundsExceeded()'),
    onViewerReady: () => mobileCaller.call('onViewerReady()'),
    onMachineParamsError: () => mobileCaller.call('onMachineParamsResult(false)')
  }
}
