
export default function drawBase(regl, params) {
  const {geometry} = params
  const {prop, buffer, elements} = regl
  return regl({
    uniforms: {
      model: prop('mat'),
      color: prop('color')
    },
    attributes: {
      position: buffer(geometry.positions),
      normal: buffer(geometry.normals)
    },
    elements : elements(geometry.cells)
  })
}
