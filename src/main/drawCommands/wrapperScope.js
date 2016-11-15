import mat4 from 'gl-mat4'

export default function wrapperScope (regl, params = {}) {
  const {fbo} = params

  let commandParams = {
    cull: {
      enable: true
    },
    context: {
      lightDir: [0.39, 0.87, 0.29]
    },
    uniforms: {
      lightDir: (context) => context.lightDir,
      lightColor: [1, 0.8, 0],
      lightView: (context) => {
        return mat4.lookAt([], context.lightDir, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0])
      },
      lightProjection: mat4.ortho([], -25, 25, -20, 20, -25, 25),

      ambientLightAmount: 0.8,
      diffuseLightAmount: 0.9,
      view: (context, props) => props.view,
      projection: (context, props) => props.camera.projection,
      camNear: (context, props) => props.camera.near,
      camFar: (context, props) => props.camera.far
    },
    framebuffer: fbo
  }

  commandParams = Object.assign({}, commandParams, params.extras)
  return regl(commandParams)
}
