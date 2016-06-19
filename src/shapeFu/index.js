var regl = require('regl')()
const {frame} = regl
import mat4 from 'gl-mat4'

import most from 'most'

import { params as cameraDefaults } from '../common/controls/orbitControls'
import camera from '../common/camera'

import { sceneData } from '../common/data'
import {controlsLoop as controlsLoop} from '../common/controls/controlsLoop'
import { interactionsFromEvents, pointerGestures } from '../common/interactions/pointerGestures'


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

const container = document.querySelectorAll('canvas')[1]
const fullData = Object.assign({}, {scene: sceneData}, settings)

// main render function: data in, rendered frame out
function render (data) {
  let _data = data
  let viewMat = data.camera.view
  _data.view = mat4.invert(viewMat, viewMat)
  drawFrame(_data)
}

// dynamic drawing
/*frame((props, context) => {
  render(fullData)
})*/

// render one frame
 //render(fullData)

// render multiple, with controls
//controlsLoop(cameraDefaults, render, fullData)

// interactions : camera controls
const baseInteractions$ = interactionsFromEvents(container)
const gestures = pointerGestures(baseInteractions$)

const camMoves$ = controlsLoop({gestures}, {settings: cameraDefaults, camera}, fullData)
const heartBeat$ = most.periodic(16)

// merge all the things that should trigger a re-render
most.merge(
  camMoves$,
  heartBeat$.map(x => fullData)
)
  .forEach(render)
