/**
 *very simple heuristic to determine whether or not normals for a given geometry
 * need to be (re)computed or not
 * @param  {Object} geometry geometry data just a pojo, CAN contain normals data
 * @param {Int} testLength how many normals to check for zero normals
 * @return {Boolean} boolean signifying whether normals need computing or not ...
*/
export default function doNormalsNeedComputing (geometry, testLength = 1000) {
  let needsRecompute = true
  if (!geometry.normals) {
    needsRecompute = true
  } else {
    // we check the fist 1000 normals to see if they are set to 0
    for (let i = 0; i < Math.min(geometry.normals.length, testLength); i++) {
      if (geometry.normals[i] !== 0) {
        needsRecompute = false
        break
      }
    }
  }
  return needsRecompute
}
