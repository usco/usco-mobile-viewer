var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'


export default function drawTri (regl, params) {
  return regl({
    vert: glslify(__dirname + '/shaders/tri.vert'),
    frag: glslify(__dirname + '/shaders/tri.frag'),

    attributes: {
      position: [
        -10, 0, 0,
        0, -10,0,
        10, 10,0]
    },
    count: 3,
    uniforms: {
      model: mat4.identity([]),
      color: regl.prop('color'),
      angle: ({tick}) => 0.01 * tick
    }
  })
}
