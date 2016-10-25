// helpers
import centerGeometry from '../common/utils/centerGeometry'
import offsetTransformsByBounds from '../common/utils/offsetTransformsByBounds'
import { injectNormals, injectTMatrix, injectBounds } from './prepPipeline'

import drawStaticMesh from './drawCommands/drawStaticMesh2/index'

export default function entityPrep (rawGeometry$, regl) {
  const addedEntities$ = rawGeometry$
    .map(geometry => ({
      transforms: {pos: [0, 0, 0], rot: [0, 0, 0], sca: [1, 1, 1]}, // [0.2, 1.125, 1.125]},
      geometry,
      visuals: {
        type: 'mesh',
        visible: true,
        color: [0.02, 0.7, 1, 1] // 07a9ff [1, 1, 0, 0.5],
      },
    meta: {id: 0}})
  )
    .map(injectNormals)
    .map(injectBounds)
    .map(function (data) {
      // console.log('preping drawCall')
      const geometry = centerGeometry(data.geometry, data.bounds, data.transforms)
      const draw = drawStaticMesh(regl, {geometry: geometry}) // one command per mesh, but is faster
      const visuals = Object.assign({}, data.visuals, {draw})
      const entity = Object.assign({}, data, {visuals}) // Object.assign({}, data, {visuals: {draw}})
      return entity
    })
    .map(function (data) {
      let transforms = Object.assign({}, data.transforms, offsetTransformsByBounds(data.transforms, data.bounds))
      const entity = Object.assign({}, data, {transforms})
      return entity
    })
    .map(injectBounds) // we need to recompute bounds based on changes above
    .map(injectTMatrix)
    .tap(entity => console.log('entity done processing', entity))
    .multicast()

  return addedEntities$
}
