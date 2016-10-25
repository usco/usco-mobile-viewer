import computeBounds from '../common/bounds/computeBounds'
import computeTMatrixFromTransforms from '../common/utils/computeTMatrixFromTransforms'
import normals from 'angle-normals'

// inject bounding box(& co) data
export function injectBounds (entity) {
  const bounds = computeBounds(entity)
  const result = Object.assign({}, entity, {bounds})
  //console.log('data with bounds', result)
  return result
}

// inject object transformation matrix : costly : only do it when changes happened to objects
export function injectTMatrix (entity) {
  const modelMat = computeTMatrixFromTransforms(entity.transforms)
  const result = Object.assign({}, entity, {modelMat})
  //console.log('result', result)
  return result
}

// inject object transformation matrix : costly : only do it when changes happened to objects
export function injectNormals (entity) {
  const {geometry} = entity
  geometry.normals = geometry.cells && !geometry.normals ? normals(geometry.cells, geometry.positions) : geometry.normals
  const result = Object.assign({}, entity, {geometry})
  return result
}
