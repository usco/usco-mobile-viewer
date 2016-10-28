var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function drawPrintheadShadow (regl, params) {
  const {width, length} = params
  const halfWidth = width * 0.5
  const halfLength = length * 0.5

  return regl({
    vert: glslify(__dirname + '/shaders/vertex.vert'),
    frag: glslify(__dirname + '/shaders/fragment.frag'),

    attributes: {
      position: [
        -halfWidth, -halfLength, 0,
        halfWidth, -halfLength, 0,
        halfWidth, halfLength, 0,
        -halfWidth, halfLength, 0
      ],
      normal: [
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1
      ]
    },
    elements: [0, 1, 3, 3, 1, 2],
    // count: 4,
    uniforms: {
      model: (context, props) => props.model || mat4.identity([]),
      color: regl.prop('color')
    },
    cull: {
      enable: true,
      face: 'back'
    },
    polygonOffset: {
      enable: true,
      offset: {
        factor: 1,
        units: Math.random() * 10
      }
    }
  })
}
