var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function drawCuboidFromCoords (regl, params) {
  const {coords, height} = params

  const position = coords
    .map(x => [...x, 0])
    .concat(coords.map(x => [...x, height]))

  // use this one for clean cube wireframe outline
  const cells = [
    0, 1, 2, 3, 0,
    4, 5, 6, 7, 4,
    5, 1, 2, 6, 7, 3
  ]

  const normal = position.map(p => 1)

  return regl({
    vert: glslify(__dirname + '/shaders/mesh.vert'),
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
    lineWidth: 3,

    depth: {
      enable: true,
      mask: false,
      func: 'less',
      range: [0, 1]
    },
    cull: {
      enable: true,
      face: 'front'
    }
  })
}
