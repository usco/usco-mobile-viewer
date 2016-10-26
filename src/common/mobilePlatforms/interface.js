import detectPlatform from './detector'
// ugh , lack of dynamic loading ...
import { onLoadModelError as androidModelError, onLoadModelSuccess as androidModelSuccess, onBoundsExceeded as androidBoundsExceeded, onViewerReady as androidViewerReady } from './androidInterface'
import { onLoadModelError as IOSModelError, onLoadModelSuccess as IOSModelSuccess, onBoundsExceeded as IOSBoundsExceeded , onViewerReady as IOSViewerReady} from './iosInterface'

console.log('platform', detectPlatform())
const platform = detectPlatform()
export function onLoadModelError (error) {
  if (platform === 'ios') {
    IOSModelError(error)
  } else {
    androidModelError(error)
  }
}

export function onLoadModelSuccess (model) {
  if (platform === 'ios') {
    IOSModelSuccess(true)
  } else {
    androidModelSuccess(true)
  }
}

export function onBoundsExceeded (model) {
  if (platform === 'ios') {
    IOSBoundsExceeded(true)
  } else {
    androidBoundsExceeded(true)
  }
}

export function onViewerReady (model) {
  if (platform === 'ios') {
    IOSViewerReady(true)
  } else {
    androidViewerReady(true)
  }
}
