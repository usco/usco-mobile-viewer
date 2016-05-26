const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import { bunnyData, bunnyData2, bunnyData3, sceneData } from '../common/data'
import _drawModel from './drawModel'
import { params as cameraDefaults } from '../common/orbitControls'

const regl = reglM()
const {frame, clear} = regl
const drawModel = _drawModel.bind(null, regl)

import loop from '../common/loop'

/* //////////////// */

const fullData = {
  sceneData,
  modelsData: [bunnyData, bunnyData2, bunnyData3]
}

/* ============================================ */

// main render function: data in, rendered frame out
function render (data) {
  const {cameraData} = data
  
  clear({
    depth: 1,
    color: [1, 1, 1, 1]
  })

  // bunnyData.selected = getRandomInt(0, 20) === 0
  drawModel(data.sceneData, data.modelsData[0], cameraData)
  drawModel(data.sceneData, data.modelsData[1], cameraData)
  drawModel(data.sceneData, data.modelsData[2], cameraData)
}

// dynamic drawing
/*frame((props, context) => {
  render(fullData)
})*/

// render one frame
//render(fullData)
loop(cameraDefaults, render, fullData)

/*const copyPixels = regl.texture({
  x: 5,
  y: 1,
  width: 10,
  height: 10,
  copy: true
})*/

// outlines experiment
/*frame((props, context) => {

  clear({stencil: 1})

})*/
