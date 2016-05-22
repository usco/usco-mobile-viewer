var regl = require('regl')()
import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
const {frame, clear, buffer, elements, prop} = regl
import bunny from 'bunny'
// import glslify from 'glslify'
var glslify = require('glslify')

const camSpeed = 1.2

function drawModel (data) {
  // const {positions, cells, mat, color, pos} = data
  const {geometry, transforms} = data
  let params = {
    vert: glslify(__dirname + '/shaders/base.vert'),
    frag: glslify(__dirname + '/shaders/base.frag'),

    attributes: {
      position: buffer(geometry.positions)
    },
    uniforms: {
      model: prop('mat'),//transforms.mat,
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
      },

      'lights[0].color': [1, 0, 0],
      'lights[1].color': [0, 1, 0],
      'lights[2].color': [0, 0, 1],
      'lights[3].color': [1, 1, 0],

      color: prop('color'),
      pos: prop('pos'),
      rot: prop('rot'),
      sca: prop('sca')
    }
  }
  if (geometry.cells) {
    params.elements = elements(geometry.cells)
    //console.log(geometry.cells.length*3)
  } else {
    params.count = geometry.positions.length / 3
  }
  const {pos, rot, sca} = data.transforms
  const {color} = data

  //create transform matrix
  let modelMat = mat4.identity([])
  mat4.translate(modelMat, modelMat, [pos[0], pos[2], pos[1]])//z up
  //mat4.rotate(modelMat, modelMat, rad:Number, axis:vec3)
  mat4.scale(modelMat, modelMat, [sca[0], sca[2], sca[1]])

  //test for batches
  /*let batches = []
  for(var i=0;i<100;i++){
    let modelMat = mat4.identity([])
    mat4.translate(modelMat, modelMat, [pos[0]+i*2+2, pos[2], pos[1]])//z up
    mat4.scale(modelMat, modelMat, [sca[0], sca[2], sca[1]])

    batches.push({pos, color, mat: modelMat})
  }
  return regl(params)(batches)
  */
  return regl(params)({pos, color, mat: modelMat})
}

/* //////////////// */
// /per model data
let triMat = mat4.identity([]) // create([])
mat4.translate(triMat, triMat, [1, 10, 20])

const triData = {
  geometry: {
    positions: [
      2, 2, 0,
      1, 2, -2,
      0, 1, -2
    ],
  },
  transforms: {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    sca: [1, 1, 1]
  },
  color: [1, 0, 0, 0.5]
}

const bunnyData = {
  geometry: bunny,
  transforms: {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    sca: [1, 1, 1]
  },
  color: [0, 1, 0, 0.5]
}

const bunnyData2 = {
  geometry: bunny,
  transforms: {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    sca: [-1, 1, -1]
  },
  color: [0, 1, 1, 0.5]
}

// do the drawing
frame((props, context) => {
  const count = context.count
  clear({
    depth: 1,
    color: [1, 1, 1, 1]
  })

  const color = [
    Math.sin(0.001 * count),
    Math.cos(0.02 * count),
    Math.sin(0.3 * count),
    1
  ]

  drawModel(triData)
  drawModel(bunnyData)
  drawModel(bunnyData2)


  /*this is slow, see batches example above for really speedy batching
  for(var i=0;i<20;i++){
    const bunnyDataT = {
      geometry: bunny,
      transforms: {
        pos: [i*2+2, 0, -5],
        rot: [0, 0, 0],
        sca: [-1, 1, -1]
      },
      color
    }
    drawModel(bunnyDataT)
  }*/

// drawModel({positions: bunny.positions, cells: bunny.cells, mat: bunnyMat, color})
})
