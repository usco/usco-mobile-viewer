import makeWrapperScope from './wrapperScope'
import makeDrawEnclosure from './drawEnclosure'
import makeDrawPrintheadShadow from './drawPrintheadShadow'

import { default as _model } from '../../common/utils/computeTMatrixFromTransforms'

export default function prepareRenderAlt (regl, params) {
  const wrapperScope = makeWrapperScope(regl)
  const drawEnclosure = makeDrawEnclosure(regl, params.machineParams)
  let tick = 0
  //entity color for outOfBounds ? [0.15, 0.15, 0.15, 0.3]

  let command = (props) => {
    const {camera, view, entities, background} = props

    wrapperScope(props, (context) => {
      regl.clear({
        color: background,
        depth: 1
      })
      entities.map(e => e.visuals.draw({view, camera, color:e.visuals.color , model: e.modelMat}))
      entities.map(function (entity) {
        const {pos} = entity.transforms
        const offset = pos[2]-entity.bounds.size[2]*0.5
        const model = _model({pos: [pos[0], pos[1], -0.1]})
        const headSize = [100,60]
        const width = entity.bounds.size[0]+headSize[0]
        const length = entity.bounds.size[1]+headSize[1]

        return makeDrawPrintheadShadow(regl, {width,length})({view, camera, model, color: [0.1, 0.1, 0.1, 0.15]})
      })

      drawEnclosure(props)
    })
  }

  return function renderAlt (data) {
    const {camera, entities, background} = data
    const {view} = camera

    command({camera, view, entities, background})

    // boilerplate etc
    tick += 0.01
    // for stats
    // regl.poll()
    return
  }
}
