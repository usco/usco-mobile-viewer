import drawGrid from './drawGrid'
import drawTri from './drawTri'
import drawFx from './drawFx'

// for testing only
let _drawGrid
let _drawTri
let _drawFx
let pixels
let tick = 0

export function makeDrawCalls (regl, data) {
  /*
  Things that need different drawCalls
  Geometry
  visuals:
    entity.visuals.vert
    entity.visuals.frag
  */
  pixels = regl.texture()

  _drawGrid = drawGrid(regl)
  _drawTri = drawTri(regl)
  _drawFx = drawFx(regl, {pixels})

  // fake
  return {hashStore: {}, entities: data.entities}
}

export function draw (regl, hashStore, data) {
  const {camera} = data
  const {view} = camera
  const {clear} = regl

  _drawGrid({view, camera, color: [1, 0, 0]})
  _drawTri({view, camera, color: [0, 1, 0, 1]})

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
      -1, 0, 0,
      0, 1, 0,
      0, 0, 0]
  })

  tick += 0.01
  return
}
