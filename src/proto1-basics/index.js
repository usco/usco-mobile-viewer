const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import { bunnyData, bunnyData2, bunnyData3, sceneData } from '../common/data'
import {drawModel as _drawModel, draw as _draw} from './draw'
import { params as cameraDefaults } from '../common/orbitControls'

const regl = reglM()
const {frame, clear} = regl
const drawModel = _drawModel.bind(null, regl)
const draw = _draw.bind(null, regl)

import loop from '../common/loop'

/* --------------------- */
// Picking

var pick = require('camera-picking-ray')
var intersect = require('ray-aabb-intersection')
var boundingBox = require('vertices-bounding-box')
/*
var bb = boundingBox(positions)
//your camera matrices
var projection = []
var view = []
var projView = mat4.multiply([], projection, view)
var invProjView = mat4.invert([], projView)

var ray = {
  ro: [0, 0, 0],
  rd: [0, 0, 0]
}

let mouse = [0, 0]

//store result in ray (origin, direction)
pick(ray.ro, ray.rd, mouse, viewport, invProjView)
//pick(origin, direction, point, viewport, invProjView)
*/
function pickStuff(){
  // first check aabb && sphere
  // then go into more precise stuff
}

/* //////////////// */

const fullData = {
  scene: sceneData,
  entities: [bunnyData, bunnyData2, bunnyData3]
}

/* ============================================ */

// main render function: data in, rendered frame out
function render (data) {

  clear({
    depth: 1,
    color: [1, 1, 1, 1]
  })

  draw(data)

  /*drawModel({scene: data.sceneData, entity: data.entities[0], camera: cameraData})
  drawModel({scene: data.sceneData, entity: data.entities[1], camera: cameraData})
  drawModel({scene: data.sceneData, entity: data.entities[2], camera: cameraData})*/
}

// dynamic drawing
/*frame((props, context) => {
  render(fullData)
})*/

// render one frame
//render(fullData)
loop(cameraDefaults, render, fullData)
