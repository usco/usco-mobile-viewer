import { computeBounds } from 'usco-bounds-utils'
import { computeTMatrixFromTransforms } from 'usco-transform-utils'
import { computeNormalsFromUnindexedPositions } from 'usco-geometry-utils'
import { doNormalsNeedComputing } from 'usco-geometry-utils'

// inject bounding box(& co) data
export function injectBounds (entity) {
  const bounds = computeBounds(entity)
  const result = Object.assign({}, entity, {bounds})
  // console.log('data with bounds', result)
  return result
}

// inject object transformation matrix : costly : only do it when changes happened to objects
export function injectTMatrix (entity) {
  const modelMat = computeTMatrixFromTransforms(entity.transforms)
  const result = Object.assign({}, entity, {modelMat})
  // console.log('result', result)
  return result
}

// inject normals
export function injectNormals (entity) {
  const {geometry} = entity
  // FIXME: not entirely sure we should always recompute it, but we had cases of files with normals specified, but wrong
  // let tmpGeometry = reindex(geometry.positions)
  // geometry.normals = normals(tmpGeometry.cells, tmpGeometry.positions)
  geometry.normals = doNormalsNeedComputing(geometry) ? computeNormalsFromUnindexedPositions(geometry.positions) : geometry.normals
  const result = Object.assign({}, entity, {geometry})
  return result
}
