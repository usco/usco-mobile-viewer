import mat4 from 'gl-mat4'

export default function wrapperScope (regl, params={}) {
  const {fbo} = params

  let commandParams = {
    cull: {
      enable: true
    },
    uniforms: {
      ambientLightAmount: 0.8,
      diffuseLightAmount: 0.8,
      view: (context, props) => props.view,
      projection: (context, props) => {
        return mat4.perspective([],
          Math.PI / 4,
          context.viewportWidth / context.viewportHeight,
          0.01,
          1000)
      }
    },
    framebuffer: fbo
  }

  commandParams = Object.assign({}, commandParams, params.extras)
  return regl(commandParams)
}
