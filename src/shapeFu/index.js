var regl = require('regl')()
var glslify = require('glslify-sync')
var mouse = require('mouse-change')(function () {})
const {frame, clear, buffer, texture, prop} = regl
import mat4 from 'gl-mat4'
import { params as cameraDefaults } from '../common/orbitControls'
import { sceneData } from '../common/data'
import loop from '../common/loop'

const drawFSO = regl({
  frag: glslify(__dirname + '/shaders/rayMarch2.frag'),
  vert: glslify(__dirname + '/shaders/base.vert'),

  attributes: {
    position: buffer([
      -2, 0,
      0, -2,
      2, 2])
  },

  uniforms: {
    view: prop('view'),
    iResolution: (props, {viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight],
    iGlobalTime: (props, {count}) => 0.01 * count + 15,

    bgColor: prop('bgColor'),
    toggleSoftShadows: prop('toggleSoftShadows'),
    toggleAO: prop('toggleAO'),

    uRM_maxIterations: prop('rayMarch.uRM_maxIterations'),
    uRM_stop_threshold: prop('rayMarch.uRM_stop_threshold'),
    uRM_grad_step: prop('rayMarch.uRM_grad_step'),
    uRM_clip_far: prop('rayMarch.uRM_clip_far'),

    'lights[0].color': prop('scene.lights[0].color'),
    'lights[0].intensity': prop('scene.lights[0].intensity'),
    'lights[0].position': prop('scene.lights[0].position'),

    'lights[1].color': prop('scene.lights[1].color'),
    'lights[1].intensity': prop('scene.lights[1].intensity'),
    'lights[1].position': prop('scene.lights[1].position'),

    'lights[2].color': prop('scene.lights[2].color'),
    'lights[2].intensity': prop('scene.lights[2].intensity'),
    'lights[2].position': prop('scene.lights[2].position'),

    'lights[3].color': prop('scene.lights[3].color'),
    'lights[3].intensity': prop('scene.lights[3].intensity'),
    'lights[3].position': prop('scene.lights[3].position')
  },

  count: 3
})

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
  drawFSO(_data)
}

// dynamic drawing
/*frame((props, context) => {
  render(settings)
})*/

// render one frame
// render(fullData)

// render multiple, with controls
loop(cameraDefaults, render, fullData)
