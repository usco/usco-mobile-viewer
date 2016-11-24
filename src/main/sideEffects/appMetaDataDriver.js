import {just} from 'most'

export default function appMetaDataDriver () {
  let json = require('../../package.json')
  let appMetadata$ = just({
    version: json.version
  })
  return appMetadata$
}
