const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import prepareRender from './drawCommands/main'
import makeDrawEnclosure from './drawCommands/drawEnclosure'


import { params as cameraDefaults } from '../common/controls/orbitControls'
import camera from '../common/camera'

import create from '@most/create'
import { combine, merge } from 'most'
import limitFlow from '../common/utils/limitFlow'

import loadAsStream from './loader'
import { concatStream } from 'usco-stl-parser'

// interactions
import controlsStream from '../common/controls/controlsStream'
// import pickStream from '../common/picking/pickStream'

import { interactionsFromEvents, pointerGestures } from '../common/interactions/pointerGestures'
/* --------------------- */
import adressBarDriver from './sideEffects/adressBarDriver'

import isObjectOutsideBounds from '../common/bounds/isObjectOutsideBounds'

import entityPrep from './entityPrep'

// basic api
import { onLoadModelError, onLoadModelSuccess, onBoundsExceeded, onViewerReady } from '../common/mobilePlatforms/interface'

import callBackToStream from '../common/utils/most/callBackToStream'

const makeModelUriFromCb = callBackToStream()
const modelUriFromExt$ = makeModelUriFromCb.stream
const setModelUri = makeModelUriFromCb.callback

const makeMachineParamsFromCb = callBackToStream()
const machineParamsFromExt$ = makeMachineParamsFromCb.stream
const setMachineParams = makeMachineParamsFromCb.callback

//ugh but no choice
window.setModelUri = setModelUri
window.setMachineParams = setMachineParams
// ////////////

const modelUri$ = merge(
  adressBarDriver,
  modelUriFromExt$
).multicast()

const machineParams$ = merge(
  machineParamsFromExt$
)


const parsedSTL$ = modelUri$
  .tap(e=>console.log('modelUri',e))
  .filter(x => x !== null)
  .delay(200)
  .flatMap(function (url) {
    return create((add, end, error) => {
      loadAsStream(url).pipe(concatStream(data => add(data)))
    })
  })
  .tap(e => console.log('done loading'))
  .flatMapError(function (error) {
    console.error('ERROR in loading mesh file !!', error)
    onLoadModelError(error)
    return undefined
  })
  .filter(x => x !== undefined)
  .multicast()

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

/* --------------------- */

/* Pipeline:
  - data => process (normals computation, color format conversion) => (drawCall generation) => drawCall
  - every object with a fundamentall different 'look' (beyond what can be done with shader parameters) => different (VS) & PS
  - even if regl can 'combine' various uniforms, attributes, props etc, the rule above still applies
*/
const machineParams = {
  machine_uuid: 'xx',
  machine_volume: [213, 220, 350],
  machine_disallowed_areas: [
    [[-91.5, -115], [-115, -115], [-115, -104.6], [-91.5, -104.6]],
    [[-99.5, -104.6], [-115, -104.6], [-115, 104.6], [-99.5, 104.6]],
    [[-94.5, 104.6], [-115, 104.6], [-115, 105.5], [-94.5, 105.5]],
    [[-91.4, 105.5], [-115, 105.5], [-115, 115], [-91.4, 115]],

    [[77.3, -115], [77.3, -98.6], [115, -98.6], [115, -115]],
    [[97.2, -98.6], [97.2, -54.5], [113, -54.5], [113, -98.6]],
    [[100.5, -54.5], [100.5, 99.3], [115, 99.3], [115, -54.5]],
    [[77, 99.3], [77, 115], [115, 115], [115, 99.3]]
  ],
  machine_head_with_fans_polygon: [
    [ -40, 10 ],
    [ -40, -30 ],
    [ 60, 10 ],
    [ 60, -30 ]
  ]
}

// interactions : camera controls
const baseInteractions$ = interactionsFromEvents(container)
const gestures = pointerGestures(baseInteractions$)
const camState$ = controlsStream({gestures}, {settings: cameraDefaults, camera})

const render = prepareRender(regl, {machineParams})
const addedEntities$ = entityPrep(parsedSTL$, regl)
//const foo$ = machineParams$

camState$.map(camera => ({entities: [], camera, background: [1, 1, 1, 1]})) // initial / empty state
  .merge(
    combine(function (camera, entity) {
      return {entities: [entity], camera, background: [1, 1, 1, 1]}
    }, camState$, addedEntities$)
)
  // .merge( containerResizes$.map)
  .thru(limitFlow(33))
  .tap(x => regl.poll())
  .forEach(x => render(x))

// boundsExceeded
const boundsExceeded$ = addedEntities$
  .map((entity) => isObjectOutsideBounds(machineParams, entity))
  .tap(e => console.log('outOfBounds??', e))
  .filter(x => x === true)

onViewerReady()

// OUTPUTS (sink side effects)
addedEntities$
  .forEach(m => onLoadModelSuccess()) // side effect => dispatch to callback)

boundsExceeded$.forEach(onBoundsExceeded) // dispatch message to signify out of bounds

//for testing
// informations about the active machine

//setModelUri('http://localhost:8080/data/sanguinololu_enclosure_full.stl')
//setMachineParams(machineParams)
