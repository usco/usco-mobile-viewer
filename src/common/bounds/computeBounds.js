import vec3 from 'gl-vec3'

import boundingBox from './boundingBox'
import boundingSphere from './boundingSphere'
/* function to compute all bounding data given geometry data + position

returns an object in this form:
bounds: {
  dia: 40,
  center: [0,20,8],
  min: [9, 10, 0],
  max: [15, 10, 4]
}

*/
export default function computeBounds (object) {
  const bbox = boundingBox(object.geometry.positions)
  const center = vec3.scale(vec3.create(), vec3.add(vec3.create(), bbox[0], bbox[1]), 0.5)
  const bsph = boundingSphere(center, object.geometry.positions)

  return {
    dia: bsph,
    center: [...center],
    min: bbox[0],
    max: bbox[1]
  }
}
