var regl = require('regl')()
import {identity, perspective, lookAt} from 'gl-mat4'
import mat4 from 'gl-mat4'
const {frame, clear, buffer, elements, prop} = regl
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

function drawModel(data) {
  const {positions, cells, count, mat, color} = data
  let params = {
    vert: glslify(__dirname + '/shaders/base.vert'),
    frag: glslify(__dirname + '/shaders/base.frag'),

    attributes: {
      position: buffer(positions)
    },
    uniforms: {
      model: mat,
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
    },

    offset: prop('offset')
  }
  if (cells) {
    //params = Object.assign(params, {elements: elements(cells)})
    params.elements = elements(cells)
  }
  if (count) {
    //params = Object.assign(params, {count})
    params.count = count
  }
  if (color) {
    let uniforms = Object.assign(params.uniforms, {color})
    //params = Object.assign(params, {uniforms})
    params.uniforms = uniforms
  }

  return regl(params)({offset: [-1, -1]})
}

// do the drawing
//
frame((props, context) => {
  const count = context.count
  clear({
    depth: 1,
    color: [0, 0, 0, 1]
  })

  //drawBunny()
  //drawTri()
  const color =   [
      Math.sin(0.001 * count),
      Math.cos(0.02 * count),
      Math.sin(0.3 * count),
      1
    ]

  drawModel({positions, count: 3, mat: objMat, color})
  drawModel({positions: bunny.positions, cells: bunny.cells, mat: bunnyMat, color})
})
