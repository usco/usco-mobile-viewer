var glslify = require('glslify-sync') // works in client & server
import { perspective } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

export default function drawGrid (regl, params = {}) {
  let positions = []
  console.log('making grid')
  const infinite = params.infinite || false

  let {size, ticks} = params
  ticks = ticks || 1
  size = size || [16, 16]

  const width = size[0]
  const length = size[1]

  for (let i = -width; i <= width; i += ticks) {
    positions.push(-length, i, 0)
    positions.push(length, i, 0)
    positions.push(-length, i, 0)
  }

  for (let i = -length; i <= length; i += ticks) {
    positions.push(i, -width, 0)
    positions.push(i, width, 0)
    positions.push(i, -width, 0)
  }

  const frag = infinite ? glslify(__dirname + '/shaders/foggy.frag') : glslify(__dirname + '/shaders/grid.frag')

  return regl({
    vert: glslify(__dirname + '/shaders/grid.vert'),
    frag,

    attributes: {
      position: regl.buffer(positions)
    },
    count: positions.length / 3,
    uniforms: {
      model: (context, props) => props.model || mat4.identity([]),
      view: (context, props) => props.view,
      _projection: (context, props) => {
        return mat4.ortho([], -300, 300, 350, -350, 0.01, 1000)
      },
      color: regl.prop('color')
    },
    lineWidth: 2,
    primitive: 'line strip',
    cull: {
      enable: true,
      face: 'front'
    },
    polygonOffset: {
      enable: false,
      offset: {
        factor: 1,
        units: Math.random()
      }
    }

  })
}
