import wrapperScope from './wrapperScope2'
import { default as modelM } from '../../../common/utils/computeTMatrixFromTransforms'
import makeDrawEncl from './drawEncl'

let tick = 0

export default function prepareRenderAlt (regl) {
  const _wrapperScope = wrapperScope(regl)

  const bg = [1, 1, 1, 1]
  const model = modelM({sca: [0.5, 0.5, 0.5]})

  let drawEncl = makeDrawEncl(regl)

  let command = (props) => {
    const {camera, view, entities} = props
    _wrapperScope(props, (context) => {
      regl.clear({
        color: bg,
        depth: 1
      })
      entities.map(e => e.visuals.draw({view, camera, color: e.visuals.color, model}))
      drawEncl(props)
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
