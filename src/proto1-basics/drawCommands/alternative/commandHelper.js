export default function commandHelper (regl, params={}) {
  let commandParams = {
    cull: {
      enable: true
    }
  }

  commandParams = Object.assign({}, commandParams, params.extras)
  return regl(commandParams)
}
