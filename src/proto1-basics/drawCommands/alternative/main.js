import wrapperScope from './wrapperScope'
import { default as modelM } from '../../../common/utils/computeTMatrixFromTransforms'

let tick = 0

export default function prepareRenderAlt (regl) {
  const _wrapperScope = wrapperScope(regl)
  const bg = [1, 1, 1, 1]
  const model = modelM({sca: [1, 1, 1]})
  let command = (props) => {
    const {camera, view, entities} = props
    _wrapperScope(props, (context) => {
      regl.clear({
        color: bg,
        depth: 1
      })
      entities.map(e => e.visuals.draw({view, camera, color: [1, 0, 0, 1], model}))
    })
  }

  return function renderAlt (data) {
    const {camera, entities} = data
    const {view} = camera

    command({camera, view, entities})

    // boilerplate etc
    tick += 0.01
    // for stats
    // regl.poll()
    return
  }
}
