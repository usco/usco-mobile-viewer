var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function drawCuboid (regl, params) {
  const {size} = params
  const [width, length, height] = size
  const halfWidth = width * 0.5
  const halfLength = length * 0.5
  const halfHeight = height * 0.5

  const position = [
    -halfWidth, -halfLength, -halfHeight,
    halfWidth, -halfLength, -halfHeight,
    halfWidth, halfLength, -halfHeight,
    -halfWidth, halfLength, -halfHeight,

    -halfWidth, -halfLength, halfHeight,
    halfWidth, -halfLength, halfHeight,
    halfWidth, halfLength, halfHeight,
    -halfWidth, halfLength, halfHeight
  ]

  // use this one for clean cube wireframe outline
  const cells = [
    0, 1, 2, 3, 0,
    4, 5, 6, 7, 4,
    5, 1, 2, 6, 7, 3
  ]

  const normal = position.map(p => p / size)

  return regl({
    vert: glslify(__dirname + '/../shaders/basic.vert'),
    frag: glslify(__dirname + '/shaders/mesh.frag'),

    attributes: {
      position,
    normal},
    elements: cells,
    uniforms: {
      model: (context, props) => props.model || mat4.identity([]),
      color: regl.prop('color'),
      angle: ({tick}) => 0.01 * tick
    },
    primitive: 'line strip',
    lineWidth: 2,

    depth: {
      enable: true,
      mask: false,
      func: 'less',
      range: [0, 1]
    }
  })
}
