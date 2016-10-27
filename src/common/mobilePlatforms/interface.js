import detectPlatform from './detector'
// ugh , lack of dynamic loading ...
// import { onLoadModelError as androidModelError, onLoadModelSuccess as androidModelSuccess, onBoundsExceeded as androidBoundsExceeded, onViewerReady as androidViewerReady } from './androidInterface'
// import { onLoadModelError as IOSModelError, onLoadModelSuccess as IOSModelSuccess, onBoundsExceeded as IOSBoundsExceeded , onViewerReady as IOSViewerReady} from './iosInterface'
import { makeAndroidInterface } from './androidInterface'
import { makeIosInterface } from './iosInterface'

export default function makeInterface () {
  console.log('platform', detectPlatform())
  const platform = detectPlatform()
  const actions = platform === 'ios' ? makeIosInterface() : makeAndroidInterface()
  return actions
}
