import drawGrid from './drawGrid/index'
import drawTri from './drawTri/index'
import drawCuboid from './drawCuboid/index'
import drawCuboidFromCoords from './drawCuboidFromCoords/index'

import { default as model } from '../../common/utils/computeTMatrixFromTransforms'

export default function Encl (regl, params) {
  const machine_disallowed_areas = [
    [[-91.5, -115], [-115, -115], [-115, -104.6], [-91.5, -104.6]],
    [[-99.5, -104.6], [-115, -104.6], [-115, 104.6], [-99.5, 104.6]],
    [[-94.5, 104.6], [-115, 104.6], [-115, 105.5], [-94.5, 105.5]],
    [[-91.4, 105.5], [-115, 105.5], [-115, 115], [-91.4, 115]],

    [[77.3, -115], [77.3, -98.6], [115, -98.6], [115, -115]],
    [[97.2, -98.6], [97.2, -54.5], [113, -54.5], [113, -98.6]],
    [[100.5, -54.5], [100.5, 99.3], [115, 99.3], [115, -54.5]],
    [[77, 99.3], [77, 115], [115, 115], [115, 99.3]]
  ]
  const machine_volume = [213, 220, 350]

  // generate a dynamic uniform from the data above
  const dynDisalowerAreasUniform = machine_disallowed_areas.map((area) => {
    return '[' + area.map(a => `vec2(${a[0]}, ${a[1]})`).join(',') + ']'
  })
  console.log('dynDisalowerAreasUniform', dynDisalowerAreasUniform)
  // ``

  // const mGridSize = [21.3, 22]
  const _drawGrid = drawGrid(regl, { size: machine_volume, ticks: 50, centered: true })

  // infinite grid
  const gridSize = [2200, 2000] // size of 'infinite grid'
  const _drawInfiniGrid = drawGrid(regl, {size: gridSize, ticks: 10, infinite: true})
  const gridOffset = model({pos: [0, 0, -1.4]})

  const triSize = {width: 50, height: 20}
  const _drawTri = drawTri(regl, {width: triSize.width, height: triSize.height})
  const triMatrix = model({ pos: [-triSize.width / 2, machine_volume[0] * 0.5, 0.5] })

  const containerSize = [machine_volume[1], machine_volume[0], machine_volume[2]]
  const _drawCuboid = drawCuboid(regl, {size: containerSize})
  const containerCuboidMatrix = model({ pos: [0, 0, machine_volume[2] * 0.5] })

  const dissalowedVolumes = machine_disallowed_areas
    .map((area) => drawCuboidFromCoords(regl, {height: 350, coords: area}))

  return ({view, camera}) => {
    _drawInfiniGrid({view, camera, color: [0, 0, 0, 0.1], model: gridOffset})

    _drawGrid({view, camera, color: [0, 0, 0, 0.1]})

    _drawTri({view, camera, color: [0, 0, 0, 0.5], model: triMatrix})
    _drawCuboid({view, camera, color: [0, 0, 0.0, 0.5], model: containerCuboidMatrix})

  // dissalowedVolumes.forEach(x => x({view, camera, color: [1, 0, 0, 1]}))
  }
}
