var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function drawMesh(regl, params={extras:{}}) {
  const {prop, buffer} = regl
  let commandParams = {
    vert: glslify(__dirname + '/../shaders/basic.vert'),
    frag: glslify(__dirname + '/../shaders/basic.frag'),

    uniforms: {
      model: mat4.identity([]),//prop('mat'),
      color: prop('color')
    },
    attributes: {
      position: prop('positions')
    },
    elements: prop('cells')
  }

  // Splice in any extra params
  commandParams = Object.assign({}, commandParams, params.extras)
  return regl(commandParams)
}
