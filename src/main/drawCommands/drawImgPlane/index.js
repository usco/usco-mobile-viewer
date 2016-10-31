var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function makeDrawImgPlane (regl, params) {
  // const {width, height} = params
  const texture = params.texture

  return regl({
    vert: glslify(__dirname + '/shaders/vert.vert'),
    frag: glslify(__dirname + '/shaders/frag.frag'),

    attributes: {
      position: [[-1, +1, 0], [+1, +1, 0], [+1, -1, 0], [-1, -1, 0]],
      uv: [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]
    },
    elements: [[2, 1, 0], [2, 0, 3]],
    uniforms: {
      model: (context, props) => props.model || mat4.identity([]),
      color: (context, props) => props.color || [0, 0, 0, 1],
    texture},
    cull: {
      enable: false,
      face: 'back'
    },
    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 1,
        dstRGB: 'one minus src alpha',
        dstAlpha: 1
      },
      equation: {
        rgb: 'add',
        alpha: 'add'
      },
      color: [0, 1, 0, 1]
    }
  })
}
