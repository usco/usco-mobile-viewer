// helpers
import centerGeometry from '../common/utils/centerGeometry'
import offsetTransformsByBounds from '../common/utils/offsetTransformsByBounds'
import { injectNormals, injectTMatrix, injectBounds } from './prepPipeline'

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
    .map(function(data){
      const geometry = centerGeometry(data.geometry, data.bounds, data.transforms)
      return Object.assign({}, data, {geometry})
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
