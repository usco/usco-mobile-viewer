const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import { bunnyData, bunnyData2, bunnyData3, sceneData } from '../common/data'
import { drawModel as _drawModel, draw as _draw, makeDrawCalls } from './draw'
import { params as cameraDefaults } from '../common/controls/orbitControls'
import camera from '../common/camera'

const regl = reglM()
const {frame, clear} = regl
const drawModel = _drawModel.bind(null, regl)
const draw = _draw.bind(null, regl)

import {controlsLoop as controlsLoop} from '../common/controls/controlsLoop'
import pickLoop from '../common/picking/pickLoop'

import boundingBox from '../common/utils/boundingBox'// from 'vertices-bounding-box'
import mat4 from 'gl-mat4'

/* --------------------- */

const container = document.querySelector('canvas')


import makeGrid from './grid'
import makeTransformGizmo from './transformsGizmo'


const grid = makeGrid(2000, 1)
const gizmo = makeTransformGizmo()

/* --------------------- */

function flatten (arr) {
  return arr.reduce(function (a, b) {
    return a.concat(b)
  }, [])
}

let fullData = {
  scene: sceneData,
  entities: flatten([bunnyData, bunnyData2, bunnyData3, grid, gizmo])//
}

// inject bounding box data
fullData.entities = fullData.entities.map(function (entity) {
  const bb = boundingBox(entity.geometry.positions)
  const bounds = {min: bb[0], max: bb[1]}

  const result = Object.assign({}, entity, {bounds})
  console.log('result', result)
  return result
})

// inject object transformation matrix : costly : only do it when changes happened

fullData.entities = fullData.entities.map(function (entity) {
  const {pos, rot, sca} = entity.transforms
  let modelMat = mat4.identity([])
  mat4.translate(modelMat, modelMat, [pos[0], pos[2], pos[1]]) // z up
  mat4.rotateX(modelMat, modelMat, rot[0])
  mat4.rotateY(modelMat, modelMat, rot[2])
  mat4.rotateZ(modelMat, modelMat, rot[1])
  mat4.scale(modelMat, modelMat, [sca[0], sca[2], sca[1]])

  const result = Object.assign({}, entity, {modelMat})
  console.log('result', result)
  return result
})

//inject bactching/rendering data
const {hashStore, entities} = makeDrawCalls(regl, fullData)
fullData.entities = entities


/* ============================================ */

// main render function: data in, rendered frame out
function render (data) {
  clear({
    depth: 1,
    color: [1, 1, 1, 1]
  })

  draw(hashStore, data)
}

// dynamic drawing
/*frame((props, context) => {
  render(fullData)
})*/

// render one frame
// render(fullData)
//controlsLoop({cameraDefaults, camera}, render, fullData)
controlsLoop(container, {settings: cameraDefaults, camera}, fullData)
  .forEach(render)

//interactions
//pickLoop(fullData)
//pickLoop(container, fullData)
