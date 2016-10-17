import makeWrapperScope from './wrapperScope'
import makeDrawEnclosure from './drawEnclosure'

export default function prepareRenderAlt (regl) {
  const wrapperScope = makeWrapperScope(regl)
  const drawEnclosure = makeDrawEnclosure(regl)
  let tick = 0

  let command = (props) => {
    const {camera, view, entities, background} = props

    wrapperScope(props, (context) => {
      regl.clear({
        color: background,
        depth: 1
      })
      entities.map(e => e.visuals.draw({view, camera, color: e.visuals.color, model: e.modelMat}))
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
