var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function drawMesh(regl, params={extras:{}}) {
  const {prop, buffer} = regl
  let commandParams = {
    vert: glslify(__dirname + '/shaders/mesh.vert'),
    frag: glslify(__dirname + '/shaders/mesh.frag'),

    uniforms: {
      model: mat4.identity([]),//prop('mat'),
      color: prop('color'),

      view: (context, props) => props.view,
      projection: (context, props) => {
        return mat4.perspective([],
          Math.PI / 4,
          context.viewportWidth / context.viewportHeight,
          0.01,
          1000)
      }    
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
