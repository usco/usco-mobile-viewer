let mobileCaller = {
  interfaceName: 'JAMDroid',

  call: function (method) {
    if (eval('typeof ' + this.interfaceName) !== 'undefined') {
      new Function(this.interfaceName + '.' + method)()
    }
  }

}

export function onLoadModelError (error) {
  mobileCaller.call('onLoadModel(false)')
}

export function onLoadModelSuccess (model) {
  mobileCaller.call('onLoadModel(true)')
}

export function onBoundsExceeded () {
  mobileCaller.call('onBoundsExceeded()')
}
