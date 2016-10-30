import prepareDrawGrid from './drawGrid/index'
import prepareDrawTriangle from './drawTri/index'
import prepareDrawCuboid from './drawCuboid/index'
import drawCuboidFromCoords from './drawCuboidFromCoords/index'

import { default as model } from '../../common/utils/computeTMatrixFromTransforms'

import svgMesh3d from 'svg-mesh-3d'
var parsePath = require('extract-svg-path').parse
import um3svg from './um3svg'
import makeDrawImgPlane from './drawImgPlane'
import makeDrawStaticMesh from './drawStaticMesh'

const testImg = require('baboon-image')

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

  //
  const logoImg = um3svg()
  const svgPath = parsePath(logoImg)
  const logoMesh = svgMesh3d(svgPath, {
    delaunay: true,
    scale: 1
  })
  const drawLogoMesh = makeDrawStaticMesh(regl, {geometry: logoMesh})

  //const logoTexure = regl.texture({data: testImg})

  var svgData = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" version="1.1">
    <rect width="200" height="200" fill="lime" stroke-width="4" stroke="pink"/>
    <circle cx="125" cy="125" r="75" fill="orange"/>
    <polyline points="50,150 50,200 200,200 200,100" stroke="red" stroke-width="4" fill="none"/>
    <line x1="50" y1="50" x2="200" y2="200" stroke="blue" stroke-width="4"/>
  </svg>`
  svgData = "data:image/svg+xml;base64," + btoa(logoImg)// window.btoa(unescape(encodeURIComponent(svgData)))

  let svgFinal =new Image()
  svgFinal.setAttribute('src', svgData)
  const logoTexure = regl.texture({data: svgFinal})//,  mag: 'linear', min: 'nearest'})

  const logoSize = [svgFinal.width, svgFinal.height].map(x=>x*0.3) // [100, 100]
  const logoPlane = makeDrawImgPlane(regl, {texture: logoTexure})
  const logoMatrix = model({pos: [0, -machine_volume[1]*0.5, 20], sca: [logoSize[0], logoSize[1], 1], rot:[Math.PI/2,Math.PI,0]})

  const drawGrid = prepareDrawGrid(regl, { size: machine_volume, ticks: 50, centered: true })
  const gridOffset = model({pos: [0, 0, -0.2]})

  const triSize = {width: 50, height: 20}
  const drawTri = prepareDrawTriangle(regl, {width: triSize.width, height: triSize.height})
  const triMatrix = model({ pos: [-triSize.width / 2, machine_volume[1] * 0.5, 0.5] })

  const containerSize = [machine_volume[0], machine_volume[1], machine_volume[2]]
  const drawCuboid = prepareDrawCuboid(regl, {size: containerSize})
  const containerCuboidMatrix = model({ pos: [0, 0, machine_volume[2] * 0.5] })

  const dissalowedVolumes = machine_disallowed_areas
    .map((area) => drawCuboidFromCoords(regl, {height: machine_volume[2], coords: area}))

  return ({view, camera}) => {
    drawGrid({view, camera, color: [0, 0, 0, 0.2], model: gridOffset})
    drawTri({view, camera, color: [0, 0, 0, 0.5], model: triMatrix})
    drawCuboid({view, camera, color: [0, 0, 0.0, 0.5], model: containerCuboidMatrix})
    // dissalowedVolumes.forEach(x => x({view, camera, color: [1, 0, 0, 1]}))
    logoPlane({view, camera, color: [0.7, 0.7, 0.7, 1], model: logoMatrix})
    //drawLogoMesh({view, camera,color: [0, 0, 0, 0.2], model: logoMatrix})
  }
}
