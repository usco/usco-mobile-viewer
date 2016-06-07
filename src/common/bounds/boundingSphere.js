import { squaredDistance, vec3 } from 'gl-vec3'

/* compute boundingSphere
  for now more or less based on three.js implementation
*/
export default function boundingSphere (center = [0, 0, 0], positions) {
  if (positions.length === 0) {
    return null
  }

  if (!center) {
    let box = boundingBox(positions)
    // min & max are the box's min & max
    let result = vec3.create()
    center = vec3.scale(result, vec3.add(result, box.min, box.max), 0.5)
  }

  let maxRadiusSq = 0
  for (let i = 0, il = positions.length; i < il; i++) {
    maxRadiusSq = Math.max(maxRadiusSq, squaredDistance(center, positions[ i ]))
  }
  return Math.sqrt(maxRadiusSq)
}

/* compute boundingSphere from boundingBox
  for now more or less based on three.js implementation
*/
export function boundingSphereFromBoundingBox (center = [0, 0, 0], positions, boundingBox) {
  if (positions.length === 0) {
    return null
  }

  if (!center) {
    // min & max are the box's min & max
    let result = vec3.create()
    center = vec3.scale(result, vec3.add(result, boundingBox[0], boundingBox[1]), 0.5)
  }

  let maxRadiusSq = 0
  for (let i = 0, il = positions.length; i < il; i++) {
    maxRadiusSq = Math.max(maxRadiusSq, squaredDistance(center, positions[ i ]))
  }
  return Math.sqrt(maxRadiusSq)
}
