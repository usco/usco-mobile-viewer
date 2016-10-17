const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)

import drawStaticMesh from './drawCommands/drawStaticMesh2/index'
import prepareRenderAlt from './drawCommands/main'

import { params as cameraDefaults } from '../common/controls/orbitControls'
import camera from '../common/camera'

import create from '@most/create'
import { combine } from 'most'

import loadAsStream from './loader'
import { concatStream } from 'usco-stl-parser'

// helpers
import centerGeometry from '../common/utils/centerGeometry'
import offsetTransformsByBounds from '../common/utils/offsetTransformsByBounds'

//interactions
import controlsStream from '../common/controls/controlsStream'
//import pickStream from '../common/picking/pickStream'

import { interactionsFromEvents, pointerGestures } from '../common/interactions/pointerGestures'
import { injectNormals, injectTMatrix, injectBounds } from './prepPipeline'
/* --------------------- */
import adressBarDriver from './sideEffects/adressBarDriver'

const parsedSTLStream = adressBarDriver
  .filter(x => x !== null)
  .delay(200)
  .flatMap(function (url) {
    return create((add, end, error) => {
      loadAsStream(url).pipe(concatStream(data => add(data)))
    })
  })
  .flatMapError(function (error) {
    console.error('ERROR in loading mesh file !!', error)
    return undefined
  })
  .filter(x => x !== undefined)

const regl = reglM({
  extensions: [
    'oes_texture_float', // FIXME: for shadows, is it widely supported ?
  // 'EXT_disjoint_timer_query'// for gpu benchmarking only
  ],

  profile: true
})
/*canvas: container,
  drawingBufferWidth: container.offsetWidth,
  drawingBufferHeight: container.offsetHeight})*/ // for editor
const container = document.querySelector('canvas')
// const container = document.querySelector('#drawHere')

const {frame, clear} = regl

/* --------------------- */

/* Pipeline:
  - data => process (normals computation, color format conversion) => (drawCall generation) => drawCall
  - every object with a fundamentall different 'look' (beyond what can be done with shader parameters) => different (VS) & PS
  - even if regl can 'combine' various uniforms, attributes, props etc, the rule above still applies
*/

// interactions : camera controls
const baseInteractions$ = interactionsFromEvents(container)
const gestures = pointerGestures(baseInteractions$)
const camState$ = controlsStream({gestures}, {settings: cameraDefaults, camera})

const renderAlt = prepareRenderAlt(regl)

const addedEntities$ = parsedSTLStream
  .map(geometry => ({
    transforms: {pos: [0, 0, 0], rot: [0, 0, 0], sca: [1, 1, 1]},// [0.2, 1.125, 1.125]},
    geometry,
    visuals: {
      type: 'mesh',
      visible: true,
      color: [0.02, 0.7, 1, 1] // 07a9ff [1, 1, 0, 0.5],
    },
    meta: {id: 0}})
)
  .map(injectNormals)
  .map(injectBounds)
  .map(function (data) {
    // console.log('preping drawCall')
    const geometry = centerGeometry(data.geometry, data.bounds, data.transforms)
    const draw = drawStaticMesh(regl, {geometry: geometry}) // one command per mesh, but is faster
    const visuals = Object.assign({}, data.visuals, {draw})
    const entity = Object.assign({}, data, {visuals}) // Object.assign({}, data, {visuals: {draw}})
    return entity
  })
  .map(function (data) {
    let transforms = Object.assign({}, data.transforms, offsetTransformsByBounds(data.transforms, data.bounds))
    const entity = Object.assign({}, data, {transforms})
    return entity
  })
  .map(injectTMatrix)
  //.tap(entity => console.log('entity done processing', entity))

camState$.map(camera => ({entities: [], camera, background: [1, 1, 1, 1]})) // initial / empty state
  .merge(
    combine(function (camera, entity) {
      return {entities: [entity], camera, background: [1, 1, 1, 1]}
    }, camState$, addedEntities$)
)
  .forEach(x => renderAlt(x))
