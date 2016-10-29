var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function makeDrawImgPlane (regl, params) {
  //const {width, height} = params
  const texture = params.texture

  return regl({
    vert: glslify(__dirname + '/shaders/vert.vert'),
    frag: glslify(__dirname + '/shaders/frag.frag'),

    attributes: {
      position: [[-0.5, +0.5, +0.5], [+0.5, +0.5, +0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5]],
      uv:[[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]
    },
    elements: [[2, 1, 0], [2, 0, 3]],
    uniforms: {
      model: (context, props) => props.model || mat4.identity([]),
      texture: texture
    },
    cull: {
      enable: false,
      face: 'back'
    }
  })
}
