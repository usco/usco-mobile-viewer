import vec3 from 'gl-vec3'

import boundingBox from './boundingBox'
import boundingSphere from './boundingSphere'

/**
 * compute all bounding data given geometry data + position
 * @param  {Object} transforms the initial transforms ie {pos:[x, x, x], rot:[x, x, x], sca:[x, x, x]}.
 * @param  {String} bounds the current bounds of the entity
 * @param  {String} axes on which axes to apply the transformation (default: [0, 0, 1])
 * @return {Object}      a new transforms object, with offset position
 * returns an object in this form:
 * bounds: {
 *  dia: 40,
 *   center: [0,20,8],
 *   min: [9, -10, 0],
 *   max: [15, 10, 4]
 *   size: [6,20,4]
 *}
 */
export default function computeBounds (object) {
  const scale = object.transforms.sca
  let bbox = boundingBox(object.geometry.positions)
  bbox[0] = bbox[0].map((x, i) => x * scale[i])
  bbox[1] = bbox[1].map((x, i) => x * scale[i])

  const center = vec3.scale(vec3.create(), vec3.add(vec3.create(), bbox[0], bbox[1]), 0.5)
  const bsph = boundingSphere(center, object.geometry.positions) * Math.max(...scale)
  const size = [bbox[1][0] - bbox[0][0], bbox[1][1] - bbox[0][1], bbox[1][2] - bbox[0][2]]

  return {
    dia: bsph,
    center: [...center],
    min: bbox[0],
    max: bbox[1],
    size
  }
}
