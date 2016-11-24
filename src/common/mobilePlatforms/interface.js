import detectPlatform from './detector'
import { makeAndroidInterface } from './androidInterface'
import { makeIosInterface } from './iosInterface'

export default function makeInterface () {
  //console.log('platform', detectPlatform())
  const platform = detectPlatform()
  const actions = platform === 'ios' ? makeIosInterface() : makeAndroidInterface()
  return actions
}
