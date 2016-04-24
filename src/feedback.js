var regl = require('regl')()
var glslify = require('glslify')
var mouse = require('mouse-change')(function () {})
const {frame, clear, buffer, texture} = regl

let pixels = texture()

const drawFeedback = regl({
  frag: glslify(__dirname + '/shaders/feedback.frag'),
  vert: glslify(__dirname + '/shaders/feedback.vert'),

  attributes: {
    position: buffer([
      -2, 0,
      0, -2,
      2, 2])
  },

  uniforms: {
    texture: pixels,
    mouse: (args, batchId, {pixelRatio, height}) => [
      mouse.x * pixelRatio,
      height - mouse.y * pixelRatio
    ],
    t: (args, batchId, {count}) => 0.01 * count
  },

  count: 3
})

frame(function () {
  clear({
    color: [0, 0, 0, 1]
  })

  drawFeedback()

  pixels({
    copy: true
  })
})
