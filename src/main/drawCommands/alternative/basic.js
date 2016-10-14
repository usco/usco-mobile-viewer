import mat4 from 'gl-mat4'

import drawGrid from './drawGrid'
import drawTri from './drawTri'
import drawCuboid from './drawCuboid'
import drawDynMesh from './drawDynMesh'
import drawStaticMesh from './drawStaticMesh'

import wrapperScope from './wrapperScope'
import { default as model } from '../../../common/utils/computeTMatrixFromTransforms'

import bunny from 'bunny'

// for testing only
let tick = 0
let command

export function makeDrawCalls (regl, data) {
  const resolutionScale = 1

  const gridSize = [220, 200]
  const mGridSize = [21.3, 22]
  const _drawGrid = drawGrid(regl, { size: mGridSize, ticks: 4 })
  const _drawInfiniGrid = drawGrid(regl, {size: gridSize, ticks: 1})
  const gridOffset = model({pos: [0, 0, 0.001]})

  const triSize = {width: 5, height: 2}
  const _drawTri = drawTri(regl, {width: triSize.width, height: triSize.height})
  const triMatrix = model({ pos: [-triSize.width / 2, mGridSize[0], 0.001] })

  const containerSize = [mGridSize[1], mGridSize[0], 35]
  const _drawCuboid = drawCuboid(regl, {size: containerSize})
  const containerCuboidMatrix = model({ pos: [0, 0, containerSize[2]] })

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
      _drawInfiniGrid({view, camera, color: [0, 0, 0, 0.5], model: gridOffset})

      _drawTri({view, camera, color: [0, 0., 0, 0.5], model: triMatrix})
      _drawCuboid({view, camera, color: [0, 0., 0.0, 0.2], model: containerCuboidMatrix})
    // _drawDynMesh({view, camera, color: [1, 0, 0, 1], positions: bunnyPositionBuffer, cells: bunny.cells})
    })
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
