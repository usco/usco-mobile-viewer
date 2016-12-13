import {just} from 'most'

/**
 * very simple driver/side effect expose the app's version (from the package.json file)
 * @return {Observable} observable with a single 'version' field as value
*/
export default function appMetaDataDriver () {
  const json = require('../../package.json')
  const appMetadata$ = just({
    version: json.version
  }).multicast()
  return appMetadata$
}
