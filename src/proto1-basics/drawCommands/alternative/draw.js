import drawGrid from './drawGrid'

//for testing only
let _drawGrid

export function makeDrawCalls (regl, data) {
  /*
  Things that need different drawCalls
  Geometry
  visuals:
    entity.visuals.vert
    entity.visuals.frag
  */

  _drawGrid = drawGrid(regl)

  //fake
  return {hashStore:{}, entities: data.entities}
}

export function draw (regl, hashStore, data) {

  const {camera} = data
  _drawGrid({view:camera.view, camera})
  return
}
