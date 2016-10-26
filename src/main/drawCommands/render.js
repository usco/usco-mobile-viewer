import makeWrapperScope from './wrapperScope'
import makeDrawPrintheadShadow from './drawPrintheadShadow'

import { default as model } from '../../common/utils/computeTMatrixFromTransforms'
import drawGrid from './drawGrid/index'

export default function prepareRenderAlt (regl, params) {
  const wrapperScope = makeWrapperScope(regl)
  let tick = 0
  //entity color for outOfBounds ? [0.15, 0.15, 0.15, 0.3]

  //infine grid, always there
  // infinite grid
  const gridSize = [1220, 1200] // size of 'infinite grid'
  const _drawInfiniGrid = drawGrid(regl, {size: gridSize, ticks: 10, infinite: true})
  const infiniGridOffset = model({pos: [0, 0, -0.4]})


  let command = (props) => {
    const {camera, view, entities, machine, background} = props
    wrapperScope(props, (context) => {
      regl.clear({
        color: background,
        depth: 1
      })
      _drawInfiniGrid({view, camera, color: [0, 0, 0, 0.1], model: infiniGridOffset})

      entities.map(e => e.visuals.draw({view, camera, color:e.visuals.color , model: e.modelMat}))
      if(machine && machine.draw){
        machine.draw(props)
      }


      /*entities.map(function (entity) {
        const {pos} = entity.transforms
        const offset = pos[2]-entity.bounds.size[2]*0.5
        const model = _model({pos: [pos[0], pos[1], -0.1]})
        const headSize = [100,60]
        const width = entity.bounds.size[0]+headSize[0]
        const length = entity.bounds.size[1]+headSize[1]

        return makeDrawPrintheadShadow(regl, {width,length})({view, camera, model, color: [0.1, 0.1, 0.1, 0.15]})
      })*/

      //drawEnclosure(props)
    })
  }

  return function render(data) {
    const {entities, machine, camera, background} = data
    const {view} = camera

    command({entities, machine, camera, view, background})

    // boilerplate etc
    tick += 0.01
    // for stats
    // regl.poll()
    return
  }
}
