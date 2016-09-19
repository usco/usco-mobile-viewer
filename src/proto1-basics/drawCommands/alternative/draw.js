import drawGrid from './drawGrid'
import drawTri from './drawTri'
import drawDynMesh from './drawDynMesh'
import drawStaticMesh from './drawStaticMesh'

import wrapperScope from './wrapperScope'
// 'special effects'
import drawConvolutionFx from './drawConvolutionFx'
import drawBlurFx from './drawBlurFx'
import drawDistortFx from './drawDistortFx'

import bunny from 'bunny'

// for testing only
let tick = 0
let command

export function makeDrawCalls (regl, data) {
  const resolutionScale = 1

  const texture = regl.texture()
  const bunnyPositionBuffer = regl.buffer(bunny.positions)

  const _drawGrid = drawGrid(regl)
  const _drawTri = drawTri(regl)

  const _drawDynMesh = drawDynMesh(regl) // does not require one command per mesh, but is slower
  const _drawBunny = drawStaticMesh(regl, {geometry: bunny}) // one command per mesh, but is faster

  const pass1Fbo = regl.framebuffer({
    color: regl.texture({
      width: 1,
      height: 1,
      wrap: 'clamp'
    }),
    depth: true
  })
  const _wrapperScope = wrapperScope(regl, {fbo: pass1Fbo})

  const _drawConvolutionFx = drawConvolutionFx(regl, {texture: pass1Fbo})
  const _drawDistortFx = drawDistortFx(regl, {texture: pass1Fbo})
  const _drawBlurFx = drawBlurFx(regl, {texture: pass1Fbo, filter_radius: 4})

  // actual 'main' render command
  let viewportWidth = 1000 * resolutionScale, viewportHeight = 500 * resolutionScale
  command = (props) => {
    const {camera, view} = props

    /*rootScope(props, (context) => {
    })*/
    pass1Fbo.resize(viewportWidth, viewportHeight)

    _wrapperScope(props, (context) => {
      // {viewportWidth, viewportHeight} = context
      viewportWidth = context.viewportWidth
      viewportHeight = context.viewportHeight
      regl.clear({
        color: [1, 1, 1, 0],
        depth: 1
      })

      _drawGrid({view, camera, color: [1, 0, 0]})
      _drawTri({view, camera, color: [0, 1, 0, 1]})
      // _drawDynMesh({view, camera, color: [1, 0, 0, 1], positions: bunnyPositionBuffer, cells: bunny.cells})
      _drawBunny({view, camera, color: [1, 0, 0, 1]})
    })
    /*_drawConvolutionFx({
      tick,
      textureSize: [texture.width, texture.height],
      kernel: [//-2
        1, 0, 0,
        0, 1, 0,
        0, 0, 0]
    })*/
    _drawDistortFx({tick, textureSize: [texture.width, texture.height]})
    _drawBlurFx({tick})
  }

  // fake
  return {hashStore: {}, entities: data.entities}
}

export function draw (regl, hashStore, data) {
  const {camera} = data
  const {view} = camera

  command({camera, view})

  // boilerplate etc
  tick += 0.01
  // for stats
  regl.poll()
  // console.log(_drawBunny.stats.gpuTime/_drawStaticMesh.stats.count)
  return
}
