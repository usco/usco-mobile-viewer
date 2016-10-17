import wrapperScope from './wrapperScope2'
import makeDrawEncl from './drawEncl'

let tick = 0

export default function prepareRenderAlt (regl) {
  const _wrapperScope = wrapperScope(regl)

  const drawEncl = makeDrawEncl(regl)

  let command = (props) => {
    const {camera, view, entities, background} = props

    _wrapperScope(props, (context) => {
      regl.clear({
        color: background,
        depth: 1
      })
      entities.map(e => e.visuals.draw({view, camera, color: e.visuals.color, model: e.modelMat}))
      drawEncl(props)
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
