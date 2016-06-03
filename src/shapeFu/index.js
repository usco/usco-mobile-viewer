var regl = require('regl')()
const {frame} = regl
import mat4 from 'gl-mat4'
import { update, params as cameraDefaults } from '../common/orbitControls'
import { sceneData } from '../common/data'
import loop from '../common/loop'
import drawFrame from './drawFrame'

// data
const settings = {
  toggleSoftShadows: false,
  toggleAO: false,
  bgColor: [1, 1, 1, 1],

  rayMarch: {
    uRM_maxIterations: 400,
    uRM_stop_threshold: 0.0001,
    uRM_grad_step: 0.01,
    uRM_clip_far: 100.0
  }
}

const fullData = Object.assign({}, {scene: sceneData}, {view: cameraDefaults.cam.view}, settings)

// main render function: data in, rendered frame out
function render (data) {
  let _data = data
  let viewMat = data.cameraData.view
  _data.view = mat4.invert(viewMat, viewMat)
  drawFrame(_data)
}

//alternate to the above
function render2 (data) {
  let _data = data
  let viewMat = data.view
  _data.view = mat4.invert(viewMat, viewMat)
  drawFrame(_data)
}


// dynamic drawing
frame((props, context) => {
  render2(fullData)
})

// render one frame
 //render2(fullData)

// render multiple, with controls
//loop(cameraDefaults, render, fullData)
