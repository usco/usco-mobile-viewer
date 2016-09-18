import drawGrid from './drawGrid'
import drawTri from './drawTri'
import drawDynMesh from './drawDynMesh'
import drawStaticMesh from './drawStaticMesh'

import drawFx from './drawFx'

import bunny from 'bunny'

// for testing only
let _drawGrid
let _drawTri
let _drawFx

let _drawDynMesh
let _drawBunny

let pixels
let tick = 0
let bunnyPositionBuffer


export function makeDrawCalls (regl, data) {
  /*
  Things that need different drawCalls
  Geometry
  visuals:
    entity.visuals.vert
    entity.visuals.frag
  */
  pixels = regl.texture()
  bunnyPositionBuffer = regl.buffer(bunny.positions)

  _drawGrid = drawGrid(regl)
  _drawTri = drawTri(regl)

  _drawDynMesh = drawDynMesh(regl)// does not require one command per mesh, but is slower
  _drawBunny = drawStaticMesh(regl, {geometry: bunny})// one command per mesh, but is faster

  _drawFx = drawFx(regl, {pixels})

  // fake
  return {hashStore: {}, entities: data.entities}
}

export function draw (regl, hashStore, data) {
  const {camera} = data
  const {view} = camera
  const {clear} = regl

  //_drawGrid({view, camera, color: [1, 0, 0]})
  _drawTri({view, camera, color: [0, 1, 0, 1]})
  //_drawDynMesh({view, camera, color: [1, 0, 0, 1], positions: bunnyPositionBuffer, cells: bunny.cells})
  _drawBunny({view, camera, color: [1, 0, 0, 1]})

  // copy all that to the texure
  pixels({copy: true})

  clear({
    depth: 1,
    color: [1, 1, 1, 1]
  })

  _drawFx({
    tick,
    textureSize: [pixels.width, pixels.height],
    kernel: [
      -2, 0, 0,
      0, 1, 0,
      0, 0, 0]
  })

  tick += 0.01
  //for stats
  regl.poll()
  //console.log(_drawBunny.stats.gpuTime/_drawStaticMesh.stats.count)
  return
}
