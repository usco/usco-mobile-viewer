import mat4 from 'gl-mat4'

import drawGrid from './drawGrid'
import drawTri from './drawTri'
import drawCuboid from './drawCuboid'
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


  const gridSize = [220,200]
  const mGridSize = [21.3,22]
  const _drawGrid = drawGrid(regl,{size:mGridSize, ticks:4 })
  const _drawGridL = drawGrid(regl,{size: gridSize})
  let gridOffset = mat4.identity([])
  mat4.translate(gridOffset, gridOffset, [0,-0.1,0]) // z up

  let triMatrix = mat4.identity([])
  const triSize = {width:5, height:2}
  let triRot = [0,0,0]
  mat4.translate(triMatrix, triMatrix, [-triSize.width/2,0.1,mGridSize[0]]) // z up
  mat4.rotateX(triMatrix, triMatrix, triRot[0])
  mat4.rotateY(triMatrix, triMatrix, triRot[2])
  mat4.rotateZ(triMatrix, triMatrix, triRot[1])
  const _drawTri = drawTri(regl, {width:triSize.width, height: triSize.height})


  const containerSize = [mGridSize[1],mGridSize[0],35]
  let containerCuboidMatrix = mat4.identity([])
  const _drawCuboid =  drawCuboid(regl, {size: containerSize})
  mat4.translate(containerCuboidMatrix, containerCuboidMatrix, [0,containerSize[2],0]) // z up


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


  const _wrapperScope = wrapperScope(regl)

  // actual 'main' render command
  let viewportWidth = window.innerWidth * resolutionScale
  let viewportHeight = window.innerHeight * resolutionScale
  let bg = [1., 1., 1., 1]
  command = (props) => {
    const {camera, view} = props
    _wrapperScope(props, (context) => {
      // {viewportWidth, viewportHeight} = context
      viewportWidth = context.viewportWidth * resolutionScale
      viewportHeight = context.viewportHeight * resolutionScale
      regl.clear({
        color: bg,
        depth: 1
      })
      _drawBunny({view, camera, color: [0.5, 0.5, 0.5, 0.8]})
      _drawGrid({view, camera, color: [0, 0, 0, 1]})
      _drawGridL({view, camera, color: [0, 0, 0, 0.2], model: gridOffset})

      _drawTri({view, camera, color: [0, 0., 0, 0.5], model: triMatrix})
      _drawCuboid({view, camera, color: [0, 0., 0.0, 0.2], model: containerCuboidMatrix})
    // _drawDynMesh({view, camera, color: [1, 0, 0, 1], positions: bunnyPositionBuffer, cells: bunny.cells})
    })

    // post fx
    //_drawBlurFx({tick})
    //_drawCombinerFx()
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
