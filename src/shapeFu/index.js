var regl = require('regl')()
var glslify = require('glslify')
var mouse = require('mouse-change')(function () {})
const {frame, clear, buffer, texture, prop} = regl

let frameTime = 30
let pixels = texture()

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
    texture: pixels,
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
    uRM_clip_far: prop('rayMarch.uRM_clip_far')
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
  }
}

// main render function: data in, rendered frame out
function render (data) {
  drawFSO(data)

  pixels({
    copy: true
  })
}

// dynamic drawing
frame((props, context) => {
  render(settings)
})

// render one frame
render(settings)
