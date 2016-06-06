const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import { bunnyData, bunnyData2, bunnyData3, sceneData } from '../common/data'
import { drawModel as _drawModel, draw as _draw } from './draw'
import { params as cameraDefaults } from '../common/orbitControls'

const regl = reglM()
const {frame, clear} = regl
const drawModel = _drawModel.bind(null, regl)
const draw = _draw.bind(null, regl)

import loop from '../common/loop'
import pickLoop from '../common/pickLoop'

var boundingBox = require('vertices-bounding-box')

/* --------------------- */


/* //////////////// */

let fullData = {
  scene: sceneData,
  entities: [bunnyData, bunnyData2, bunnyData3]
}

// inject bounding box data
fullData.entities = fullData.entities.map(function (entity) {
  const bb = boundingBox(entity.geometry.positions)
  const bounds = {min: bb[0], max: bb[1]}

  const result = Object.assign({}, entity, {bounds})
  console.log('result', result)
  return result
})

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
// render(fullData)
loop(cameraDefaults, render, fullData)

//interactions
pickLoop(fullData)
