var regl = require('regl')()
var glslify = require('glslify-sync')
var mouse = require('mouse-change')(function () {})
const {frame, clear, buffer, texture, prop} = regl
import { sceneData } from '../common/data'


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
    iResolution: (props, {viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight],
    iMouse: (props, {pixelRatio, viewportHeight}) => [
      mouse.x * pixelRatio,
      viewportHeight - mouse.y * pixelRatio
    ],
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
    'lights[1].position': prop('scene.lights[1].position')
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
    uRM_stop_threshold: 0.001,
    uRM_grad_step: 0.1,
    uRM_clip_far: 100.0
  },

  scene: {
    lights: [
      {position: [20.0, 20.0, 20.0], color: [1.0, 0.7, 0.7], intensity: 0.5},
      {position: [-20.0, -20.0, -20.0], color: [0.3, 0.7, 1.0], intensity: 1}
      //  {position: [20.0, 20.0, 20.0], color: [0.9, 0.9, 0.9], intensity: 0.8},
      //  {position: [-20.0, -20.0, -20.0], color: [0.6, 0.7, 0.8], intensity: 0.5}
    ]
  }
}

// main render function: data in, rendered frame out
function render (data) {
  drawFSO(data)
}

// dynamic drawing
frame((props, context) => {
  render(settings)
})

// render one frame
render(settings)
