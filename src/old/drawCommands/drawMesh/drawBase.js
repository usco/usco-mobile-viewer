
export default function drawBase(regl, params) {
  const {geometry} = params
  const {prop, buffer, elements} = regl
  let commandParams = {
    uniforms: {
      model: prop('mat'),
      color: prop('color')
    },
    attributes: {
      position: buffer(geometry.positions),
      normal: buffer(geometry.normals)
    },
    elements : elements(geometry.cells)
  }

  //Splice in any extra params
  commandParams = Object.assign({}, commandParams, params.extras)
  console.log('here')
  return regl(commandParams)
}
