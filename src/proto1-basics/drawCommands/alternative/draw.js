import drawGrid from './drawGrid'
import drawTri from './drawTri'
import drawDynMesh from './drawDynMesh'
import drawStaticMesh from './drawStaticMesh'

import wrapperScope from './wrapperScope'
// 'special effects'
import drawConvolutionFx from './drawConvolutionFx'
import drawBlurFx from './drawBlurFx'
import drawDistortFx from './drawDistortFx'
import drawCombinerFx from './drawCombinerFx'

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

  const blurredFbo = regl.framebuffer({
    color: regl.texture({
      width: 1,
      height: 1,
      wrap: 'clamp'
    }),
    depth: true
  })
  const blurPassResMultiplier = 0.25

  const pass2Fbo = regl.framebuffer({
    color: regl.texture({
      width: 1,
      height: 1,
      wrap: 'clamp'
    }),
    depth: true
  })

  const _wrapperScope = wrapperScope(regl, {fbo: pass1Fbo})
  const _wrapperScope2 = wrapperScope(regl, {fbo: pass2Fbo})

  const _drawConvolutionFx = drawConvolutionFx(regl, {texture: pass1Fbo})
  const _drawDistortFx = drawDistortFx(regl, {texture: pass1Fbo})
  const _drawBlurFx = drawBlurFx(regl, {texture: pass2Fbo, filter_radius: 14, fbo: blurredFbo})
  const _drawCombinerFx = drawCombinerFx(regl, {diffuseTex: pass1Fbo, glowTex: blurredFbo})

  // actual 'main' render command
  let viewportWidth = window.innerWidth * resolutionScale
  let viewportHeight = window.innerHeight * resolutionScale
  let bg = [0., 0., 0., 1]
  command = (props) => {
    const {camera, view} = props

    pass1Fbo.resize(viewportWidth, viewportHeight)
    pass2Fbo.resize(viewportWidth, viewportHeight)
    blurredFbo.resize(viewportWidth * blurPassResMultiplier, viewportHeight * blurPassResMultiplier)

    _wrapperScope(props, (context) => {
      // {viewportWidth, viewportHeight} = context
      viewportWidth = context.viewportWidth * resolutionScale
      viewportHeight = context.viewportHeight * resolutionScale
      regl.clear({
        color: bg,
        depth: 1
      })
      _drawBunny({view, camera, color: [0.7, 1, 0, 1]})

    // _drawGrid({view, camera, color: [1, 0, 0]})
    // _drawTri({view, camera, color: [0, 1, 0, 1]})
    // _drawDynMesh({view, camera, color: [1, 0, 0, 1], positions: bunnyPositionBuffer, cells: bunny.cells})
    })

    _wrapperScope2(props, (context) => {
      regl.clear({
        color: bg,
        depth: 1
      })
      _drawBunny({view, camera, color: [0.5, 1, 0.5, 1]})
    })
    // post fx
    /*_drawConvolutionFx({tick, textureSize: [texture.width, texture.height],
      kernel: [//-2
        1, 0, 0,
        0, 1, 0,
        0, 0, 0]
    })*/
    //_drawDistortFx({tick, textureSize: [texture.width, texture.height]})
    _drawBlurFx({tick})
    _drawCombinerFx()
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
