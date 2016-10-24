import drawGrid from './drawGrid/index'
import drawTri from './drawTri/index'
import drawCuboid from './drawCuboid/index'
import drawCuboidFromCoords from './drawCuboidFromCoords/index'

import { default as model } from '../../common/utils/computeTMatrixFromTransforms'

export default function makeDrawEnclosure (regl, params) {
  const {machine_disallowed_areas, machine_volume} = params

  // generate a dynamic uniform from the data above
  const dynDisalowerAreasUniform = machine_disallowed_areas.map((area, index) => {
    const def = `vec2 disArea_${index}[${area.length}]
`
    const asgnments = area.map((a, i) => `disArea_${index}[${i}] = vec2(${a[0]}, ${a[1]})
`) // '[' + area.map(a => `vec2(${a[0]}, ${a[1]})`).join(',') + ']'
    return def + asgnments
  })
  // console.log('dynDisalowerAreasUniform', dynDisalowerAreasUniform)
  // vec2 foo[1]
  // foo[0] = vec2(0.,1.)
  // foo[1] = vec2(1.,0.)

  // const mGridSize = [21.3, 22]
  const _drawGrid = drawGrid(regl, { size: machine_volume, ticks: 50, centered: true })
  const gridOffset = model({pos: [0, 0, 0.1]})

  // infinite grid
  const gridSize = [1220, 1200] // size of 'infinite grid'
  const _drawInfiniGrid = drawGrid(regl, {size: gridSize, ticks: 10, infinite: true})
  const infiniGridOffset = model({pos: [0, 0, -2]})

  const triSize = {width: 50, height: 20}
  const _drawTri = drawTri(regl, {width: triSize.width, height: triSize.height})
  const triMatrix = model({ pos: [-triSize.width / 2, machine_volume[0] * 0.5, 0.5] })

  const containerSize = [machine_volume[0], machine_volume[1], machine_volume[2]]
  const _drawCuboid = drawCuboid(regl, {size: containerSize})
  const containerCuboidMatrix = model({ pos: [0, 0, machine_volume[2] * 0.5] })

  const dissalowedVolumes = machine_disallowed_areas
    .map((area) => drawCuboidFromCoords(regl, {height: machine_volume[2], coords: area}))

  return ({view, camera}) => {
     _drawInfiniGrid({view, camera, color: [0, 0, 0, 0.1], model: infiniGridOffset})

    _drawGrid({view, camera, color: [0, 0, 0, 0.1], model: gridOffset})

    _drawTri({view, camera, color: [0, 0, 0, 0.5], model: triMatrix})
    _drawCuboid({view, camera, color: [0, 0, 0.0, 0.5], model: containerCuboidMatrix})

  // dissalowedVolumes.forEach(x => x({view, camera, color: [1, 0, 0, 1]}))
  }
}
