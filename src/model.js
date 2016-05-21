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
  0, 1, -2
]
let objMat = mat4.identity([])// create([])
mat4.translate(objMat, objMat, [1, 10, 20])

let bunnyMat = mat4.identity([])// create([])

const camSpeed = 0.2

const drawTri = regl({
  vert: glslify(__dirname + '/shaders/base.vert'),
  frag: glslify(__dirname + '/shaders/base.frag'),

  attributes: {
    position: buffer(positions)
  },
  count: 3,

  uniforms: {
    model: objMat, // identity([]),
    view: (props, context) => {
      const t = 0.01 * context.count * camSpeed
      return mat4.lookAt([],
        [30 * Math.cos(t), 2.5, 30 * Math.sin(t)],
        [0, 2.5, 0],
        [0, 1, 0])
    },
    projection: (props, context) => {
      return perspective([],
        Math.PI / 4,
        context.viewportWidth / context.viewportHeight,
        0.01,
        1000)
    }
  }
})

const drawBunny = regl({
  vert: glslify(__dirname + '/shaders/base.vert'),
  frag: glslify(__dirname + '/shaders/base.frag'),

  attributes: {
    position: buffer(bunny.positions)
  },
   elements: elements(bunny.cells),

  uniforms: {
    model: bunnyMat, // identity([]),
    view: (props, context) => {
      const t = 0.01 * context.count * camSpeed
      return mat4.lookAt([],
        [30 * Math.cos(t), 2.5, 30 * Math.sin(t)],
        [0, 2.5, 0],
        [0, 1, 0])
    },
    projection: (props, context) => {
      return perspective([],
        Math.PI / 4,
        context.viewportWidth / context.viewportHeight,
        0.01,
        1000)
    }
  }
})

// do the drawing
frame(() => {
  clear({
    depth: 1,
    color: [0, 0, 0, 1]
  })

  drawBunny()
  drawTri()
})
