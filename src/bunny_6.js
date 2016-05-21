var regl = require('regl')()
import {identity, perspective, lookAt} from 'gl-mat4'
import mat4 from 'gl-mat4'
const {frame, clear, buffer, elements} = regl
import bunny from 'bunny'
//import glslify from 'glslify'
var glslify = require('glslify')

const positions = [
  2, 2, 0,
  1, 2, -2,
  0, 1, -2,
  ]
let objMat = mat4.identity([])//create([])
mat4.translate(objMat, objMat, [1, 10, 20])

const camSpeed = 5.2

const drawBunny = regl({
  vert: glslify(__dirname + '/shaders/base.vert'),
  frag: glslify(__dirname + '/shaders/base.frag'),

  attributes: {
    position: buffer(positions)
  },
  count: 3,
  // elements: elements(bunny.cells),

  uniforms: {
    model: objMat,//identity([]),
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

// do the drawing
frame(() => {
  clear({
    depth: 1,
    color: [0, 0, 0, 1]
  })

  drawBunny()
})

/*view: (props, context) => {
      var t = 0.01 * context.count
      return mat4.lookAt([],
        [30 * Math.cos(t), 2.5, 30 * Math.sin(t)],
        [0, 2.5, 0],
        [0, 1, 0])
    },
    projection: (props, context) => {
      return mat4.perspective([],
        Math.PI / 4,
        context.viewportWidth / context.viewportHeight,
        0.01,
        1000)
    }*/
