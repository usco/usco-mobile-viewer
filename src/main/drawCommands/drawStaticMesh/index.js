var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function drawMesh (regl, params = {extras: {}}) {
  const {prop, buffer} = regl
  const {geometry} = params
  let commandParams = {
    vert: glslify(__dirname + '/shaders/mesh.vert'),
    frag: glslify(__dirname + '/shaders/mesh.frag'),

    uniforms: {
      model: (context, props) => props.model || mat4.identity([]),
      color: prop('color')
    },
    attributes: {
      position: buffer(geometry.positions)
    },
    elements: geometry.cells,
    cull: {
      enable: false,
      face: 'front'
    }
  }

  // Splice in any extra params
  commandParams = Object.assign({}, commandParams, params.extras)
  return regl(commandParams)
}
