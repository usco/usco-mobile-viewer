var glslify = require('glslify-sync') // works in client & server

export default function drawDepth(regl, params) {
  const {fbo} = params
  return regl({
    vert: glslify(__dirname + '/shaders/depth.vert'),
    frag: glslify(__dirname + '/shaders/depth.frag'),
    framebuffer: fbo
  })
}
