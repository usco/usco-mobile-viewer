var glslify = require('glslify-sync') // works in client & server
import { perspective } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'


export default function drawGrid(regl, params) {
  let positions = []
  console.log('making grid')

  const size = 100
  const ticks = 5
  for (let i = -size;i < size;i += ticks) {
    positions.push(-size, 0, i)
    positions.push(size, 0, i)
    positions.push(-size, 0, i)
  }

  for (let i = -size;i < size;i += ticks) {
    positions.push(i, 0, -size)
    positions.push(i, 0, size)
    positions.push(i, 0, -size)
  }

  return regl({
    vert: glslify(__dirname + '/shaders/grid.vert'),
    frag: glslify(__dirname + '/shaders/grid.frag'),

    attributes: {
      position: regl.buffer(positions)
    },
    count : positions.length / 3,
    uniforms: {
      model: mat4.identity([]),
      view: (context, props) => props.view,
      _projection: (context, props) => {
        return mat4.perspective([],
          Math.PI / 4,
          context.viewportWidth / context.viewportHeight,
          0.01,
          1000)
      },
      projection: (context, props) => {
        return mat4.ortho([], -300, 300, 350, -350, 0.01, 1000)
      }
    },
    lineWidth: 1,
    primitive: 'line strip'
  })
}
