const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import { identity, perspective } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

import { bunnyData, bunnyData2, bunnyData3, sceneData } from './data'
import _drawModel from './drawModel'

const regl = reglM()
const {frame, clear} = regl

const drawModel = _drawModel.bind(null, regl)

import { params, update, rotate } from '../common/orbitControls'

/* //////////////// */

const fullData = {
  sceneData,
  modelsData: [bunnyData, bunnyData2, bunnyData3]
}

// FIXME: hack for now
let cameraDefaults = params
let cameraData = update(params)
let prevMouse = [0, 0]

function onMouseChange (buttons, x, y, mods) {
  //console.log('mouse-change', buttons, x, y, mods)
  if(buttons === 1) {
    let delta = [x - prevMouse[0], y - prevMouse[1]]
    let angle = [0, 0]
    angle[0] = 2 * Math.PI * delta[0] / 1800 * 2.0
    angle[1] = -2 * Math.PI * delta[1] / 1800 * 2.0

    cameraData = Object.assign({}, cameraDefaults, cameraData)
    cameraData = update(rotate(cameraData, angle))
    render(fullData)
  }
  prevMouse = [x, y]
}
require('mouse-change')(onMouseChange)

// main render function: data in, rendered frame out
function render (data) {
  clear({
    depth: 1,
    color: [1, 1, 1, 1]
  })

  // const cameraData = update(params)
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
render(fullData)

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
