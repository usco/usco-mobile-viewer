const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import { bunnyData, bunnyData2, bunnyData3, sceneData } from '../common/data'
import { drawModel as _drawModel, draw as _draw, makeDrawCalls } from './draw'
import { params as cameraDefaults } from '../common/controls/orbitControls'
import camera from '../common/camera'

import normals from 'angle-normals'


const regl = reglM({extensions: 'oes_texture_float'})//FIXME: for shadows, is it widely supported
/*canvas: container,
  drawingBufferWidth: container.offsetWidth,
  drawingBufferHeight: container.offsetHeight})*/ //for editor

const {frame, clear} = regl
//const drawModel = _drawModel.bind(null, regl)
const draw = _draw.bind(null, regl)

import {controlsLoop as controlsLoop} from '../common/controls/controlsLoop'
import pickLoop from '../common/picking/pickLoop'

import computeBounds from '../common/bounds/computeBounds'// from 'vertices-bounding-box'
import computeTMatrixFromTransforms from '../common/utils/computeTMatrixFromTransforms'

import most from 'most'

import { interactionsFromEvents, pointerGestures } from '../common/interactions/pointerGestures'

/* --------------------- */

const container = document.querySelector('canvas')
//const container = document.querySelector('#drawHere')


import makeGrid from './grid'
import makeShadowPlane from './shadowPlane'
import makeTransformGizmo from './transformsGizmo'

const grid = makeGrid(160, 1)
const gizmo = makeTransformGizmo()
const shadowPlane = makeShadowPlane(160)


/* --------------------- */

function flatten (arr) {
  return arr.reduce(function (a, b) {
    return a.concat(b)
  }, [])
}

let fullData = {
  scene: sceneData,
  entities: flatten([bunnyData, bunnyData2, bunnyData3, grid, shadowPlane, gizmo])
}

// inject bounding box data
fullData.entities = fullData.entities.map(function (entity) {
  const bounds = computeBounds(entity)
  const result = Object.assign({}, entity, {bounds})
  console.log('data with bounds', result)
  return result
})

// inject object transformation matrix : costly : only do it when changes happened to objects
fullData.entities = fullData.entities.map(function (entity) {
  const modelMat = computeTMatrixFromTransforms(entity)
  const result = Object.assign({}, entity, {modelMat})
  console.log('result', result)
  return result
})

// compute normals when needed : costly : only do it when changes happened to objects
fullData.entities = fullData.entities.map(function (entity) {
  const buffer = regl.buffer
  const {geometry} = entity
  geometry.normals = geometry.cells && !geometry.normals ? normals(geometry.cells, geometry.positions) : geometry.normals
  const result = Object.assign({}, entity, {geometry})
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

// interactions : camera controls
const baseInteractions$ = interactionsFromEvents(container)
const gestures = pointerGestures(baseInteractions$)
const camMoves$ = controlsLoop({gestures}, {settings: cameraDefaults, camera}, fullData)

// interactions : picking
const picks$ = pickLoop({gestures}, fullData)
  .map(e => fullData)

// merge all the things that should trigger a re-render
most.merge(
  camMoves$,
  picks$
)
  .forEach(render)
