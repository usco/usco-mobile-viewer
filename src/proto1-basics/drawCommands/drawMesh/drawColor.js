var glslify = require('glslify-sync') // works in client & server

export default function drawColor(regl, params) {
  const {entity} = params
  return regl({
    vert: entity.visuals && entity.visuals.vert ? entity.visuals.vert : glslify(__dirname + '/shaders/base.vert'),
    frag: entity.visuals && entity.visuals.frag ? entity.visuals.frag : glslify(__dirname + '/shaders/base.frag')
  })
}
