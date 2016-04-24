var regl = require('regl')()
var glslify = require('glslify')
var mouse = require('mouse-change')(function () {})
const {frame, clear, buffer, texture} = regl

let pixels = texture()

let toggleSoftShadows = false
let toggleAO = false

const drawFSO = regl({
  frag: glslify(__dirname + '/shaders/rayMarch.frag'),
  vert: glslify(__dirname + '/shaders/feedback.vert'),

  attributes: {
    position: buffer([
      -2, 0,
      0, -2,
      2, 2])
  },

  uniforms: {
    texture: pixels,
    iResolution: (args, batchId, {width, height}) => [width, height],
    iMouse: (args, batchId, {pixelRatio, height}) => [
      mouse.x * pixelRatio,
      height - mouse.y * pixelRatio
    ],
    iGlobalTime: (args, batchId, {count}) => 0.01 * count,
    toggleSoftShadows: () => toggleSoftShadows,
    toggleAO: () => toggleAO
  },

  count: 3
})

/*frame(function () {
  clear({
    color: [0, 0, 0, 1]
  })

  drawFSO()

  pixels({
    copy: true
  })
})*/
setInterval(function () {
  //toggleSoftShadows = ! toggleSoftShadows
  clear({
    color: [0, 0, 0, 1]
  })
  drawFSO()
}, 90);
