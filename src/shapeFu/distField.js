var regl = require('regl')()
var glslify = require('glslify')
var mouse = require('mouse-change')(function () {})
const {frame, clear, buffer, texture} = regl

let frameTime = 30
let toggleSoftShadows = false
let toggleAO = false

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
    iResolution: (args, batchId, {width, height}) => [width, height],
    iMouse: (args, batchId, {pixelRatio, height}) => [
      mouse.x * pixelRatio,
      height - mouse.y * pixelRatio
    ],
    iGlobalTime: (args, batchId, {count}) => 0.01 * count+15,
    toggleSoftShadows: () => toggleSoftShadows,
    toggleAO: () => toggleAO
  },

  count: 3
})

function drawFrame () {
  clear({
    color: [0, 0, 0, 1]
  })

  drawFSO()

  pixels({
    copy: true
  })
}

function controlledFrame (cb){
  let frameState = {count: 0, t: performance.now(), dt: undefined}

  setInterval(function () {
    // ugh mutating
    var now = performance.now()
    frameState.dt = now - frameState.t
    frameState.t = now
    frameState.count += 1

    // console.log(frameState.count, frameState.t, frameState.dt)
    cb(frameState.count, frameState.t, frameState.dt)
  }, frameTime)
}

frame(drawFrame)
//controlledFrame(drawFrame)
