import prepareDrawGrid from './drawGrid'
import prepareDrawTriangle from './drawTri'
import prepareDrawCuboid from './drawCuboid'
import drawCuboidFromCoords from './drawCuboidFromCoords'
import makeDrawStaticMesh from './drawStaticMesh'

import { default as model } from '../../common/utils/computeTMatrixFromTransforms'

// import svgStringAsReglTexture from '../../common/utils/image/svgStringAsReglTexture'
// import svgStringAsGeometry from '../../common/utils/geometry/svgStringAsGeometry'
import getBrandingSvgGeometry from '../../branding/getBrandingSvgGeometry'
// import getBrandingSvg from '../../branding/getBrandingSvg'
// import makeDrawImgPlane from './drawImgPlane'


export default function makeDrawEnclosure (regl, params) {
  const {machine_disallowed_areas, machine_volume, name} = params

  const drawGrid = prepareDrawGrid(regl, { size: machine_volume, ticks: 50, centered: true })
  const drawGridDense = prepareDrawGrid(regl, { size: machine_volume, ticks: 10, centered: true })
  const gridOffset = model({pos: [0, 0, 0.1]})
  const gridOffsetD = model({pos: [0, 0, 0.5]})

  const triSize = {width: 50, height: 20}
  const drawTri = prepareDrawTriangle(regl, {width: triSize.width, height: triSize.height})
  const triMatrix = model({ pos: [-triSize.width / 2, machine_volume[1] * 0.5, 0.1] })

  const containerSize = [machine_volume[0], machine_volume[1], machine_volume[2]]
  const drawCuboid = prepareDrawCuboid(regl, {size: containerSize})
  const containerCuboidMatrix = model({ pos: [0, 0, machine_volume[2] * 0.5] })

  const buildPlaneGeo = {
    positions: [[-1, +1, 0], [+1, +1, 0], [+1, -1, 0], [-1, -1, 0]],
    cells: [[2, 1, 0], [2, 0, 3]]
  }
  const planeReducer = 0.5// fudge value in order to prevent overlaps with bounds (z fighting)
  const buildPlaneModel = model({ pos: [0, 0, -0.15], sca: [machine_volume[0] * 0.5 - planeReducer, machine_volume[1] * 0.5 - planeReducer, 1] })
  const drawBuildPlane = makeDrawStaticMesh(regl, {
    geometry: buildPlaneGeo,
    extras: {
      cull: {
        enable: true,
        face: 'back'
      }
    }
  })

  // branding
  // const logoTexure = svgStringAsReglTexture(regl, getBrandingSvg(name))
  // const logoPlane = makeDrawImgPlane(regl, {texture: logoTexure})
  // logoTexure.width * logoScale, logoTexure.height * logoScale
  const logoMatrix = model({pos: [0, -machine_volume[1] * 0.5, 20], sca: [60, 60, 1], rot: [Math.PI / 2, Math.PI, 0]})
  const logoMesh = getBrandingSvgGeometry(name)
  if(!logoMesh) console.warn(`no logo found for machine called: '${name}' `)
  const drawLogoMesh = logoMesh ? makeDrawStaticMesh(regl, {geometry: logoMesh}) : () => {}

  // const logoMesh = svgStringAsGeometry(logoImg)
  //const dissalowedVolumes = machine_disallowed_areas
  //  .map((area) => drawCuboidFromCoords(regl, {height: machine_volume[2], coords: area}))

  return ({view, camera}) => {
    drawGrid({view, camera, color: [0, 0, 0, 0.2], model: gridOffset})
    drawGridDense({view, camera, color: [0, 0, 0, 0.06], model: gridOffsetD})

    // drawTri({view, camera, color: [0, 0, 0, 0.5], model: triMatrix})
    drawBuildPlane({view, camera, color: [1, 1, 1, 1], model: buildPlaneModel})
    drawCuboid({view, camera, color: [0, 0, 0.0, 0.5], model: containerCuboidMatrix})
    // dissalowedVolumes.forEach(x => x({view, camera, color: [1, 0, 0, 1]}))
    // logoPlane({view, camera, color: [0.4, 0.4, 0.4, 1], model: logoMatrix2})
    drawLogoMesh({view, camera, color: [0, 0, 0, 0.5], model: logoMatrix})
  }
}
