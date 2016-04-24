var regl = require('regl')()
import {identity, perspective, lookAt} from 'gl-mat4'
const {frame, clear, buffer, elements} = regl
import bunny from 'bunny'
//import glslify from 'glslify'
var glslify = require('glslify')


const camSpeed = 1

const drawBunny = regl({
  vert: glslify(__dirname + '/shaders/base.vert'),
  frag: glslify(__dirname + '/shaders/base.frag'),

  attributes: {
    position: buffer(bunny.positions)
  },

  elements: elements(bunny.cells),

  uniforms: {
    model: identity([]),
    view: (args, batchId, stats) => {
      const t = 0.01 * stats.count * 1 / camSpeed
      return lookAt([],
        [30 * Math.cos(t), 2.5, 30 * Math.sin(t)],
        [0, 2.5, 0],
        [0, 1, 0])
    },
    projection: (args, batchId, stats) => perspective([],
        Math.PI / 4,
        stats.width / stats.height,
        0.01,
        1000)
  }
})

frame(() => {
  clear({
    depth: 1,
    color: [0, 0, 0, 1]
  })

  drawBunny()
})
