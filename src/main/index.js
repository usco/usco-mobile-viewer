const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import prepareRender from './drawCommands/render'

import { params as cameraDefaults } from '../common/controls/orbitControls'
import camera from '../common/camera'

import { combine, combineArray, merge, just } from 'most'
import limitFlow from '../common/utils/most/limitFlow'

import loadAsStream from './loader'

// interactions
import controlsStream from '../common/controls/controlsStream'
// import pickStream from '../common/picking/pickStream'

import { interactionsFromEvents, pointerGestures } from '../common/interactions/pointerGestures'
/* --------------------- */
import adressBarDriver from './sideEffects/adressBarDriver'

import isObjectOutsideBounds from '../common/bounds/isObjectOutsideBounds'

import entityPrep from './entityPrep'
import { makeEntitiesModel, makeMachineModel, makeState } from './state'
import { makeVisualState } from './visualState'

// basic api
import makeInterface from '../common/mobilePlatforms/interface'
import nativeApiDriver from './sideEffects/nativeApiDriver'

// ////////////
const {onLoadModelError, onLoadModelSuccess, onBoundsExceeded, onViewerReady, onMachineParamsError, onMachineParamsSuccess} = makeInterface()
const nativeApi = nativeApiDriver()

const regl = reglM({
  extensions: [
    //  'oes_texture_float', // FIXME: for shadows, is it widely supported ?
    // 'EXT_disjoint_timer_query'// for gpu benchmarking only
  ],
  profile: true
})

const container = document.querySelector('canvas')
/* --------------------- */
/* Pipeline:
  - data => process (normals computation, color format conversion) => (drawCall generation) => drawCall
  - every object with a fundamentall different 'look' (beyond what can be done with shader parameters) => different (VS) & PS
  - even if regl can 'combine' various uniforms, attributes, props etc, the rule above still applies
*/

// ///////
const modelUri$ = merge(
  adressBarDriver,
  nativeApi.modelUri$
)
  .flatMapError(function (error) {
    // console.log('error', error)
    onLoadModelError(error)
    return just(null)
  })
  .filter(x => x !== null)
  .multicast()

const setMachineParams$ = merge(
  nativeApi.machineParams$
)
  .flatMapError(function (error) {
    // console.log('error', error)
    onMachineParamsError(error)
    return just(null)
  })
  .filter(x => x !== null)
  .tap(e => onMachineParamsSuccess(true))
  .multicast()

const parsedSTL$ = modelUri$
  .flatMap(loadAsStream)
  .flatMapError(function (error) {
    onLoadModelError(error)
    return just(undefined)
  })
  .filter(x => x !== undefined)
  .multicast()

// interactions : camera controls
const baseInteractions$ = interactionsFromEvents(container)
const gestures = pointerGestures(baseInteractions$)
const camState$ = controlsStream({gestures}, {settings: cameraDefaults, camera})

const render = prepareRender(regl)
const addEntities$ = entityPrep(parsedSTL$)
const setEntityBoundsStatus$ = merge(setMachineParams$, addEntities$.sample((x) => x, setMachineParams$))

const entities$ = makeEntitiesModel({addEntities: addEntities$, setEntityBoundsStatus: setEntityBoundsStatus$})
const machine$ = makeMachineModel({setMachineParams: setMachineParams$})

const appState$ = makeState(machine$, entities$)

const visualState$ = makeVisualState(regl, machine$, entities$, camState$)
  .thru(limitFlow(33))
  .flatMapError(function (error) {
    console.error('error in rendering', error)
    return just(null)
  })
  .filter(x => x !== null)
  .tap(x => regl.poll())
  .forEach(x => render(x))

// boundsExceeded
const boundsExceeded$ = combine(function (entity, machineParams) {
  // console.log('boundsExceeded', entity, machineParams)
  return isObjectOutsideBounds(machineParams, entity)
}, addEntities$, setMachineParams$)
  // .map((entity) => isObjectOutsideBounds(machineParams, entity))
  .tap(e => console.log('outOfBounds??', e))
  .filter(x => x === true)

onViewerReady()

// OUTPUTS (sink side effects)
addEntities$.forEach(m => onLoadModelSuccess()) // side effect => dispatch to callback)
boundsExceeded$.forEach(onBoundsExceeded) // dispatch message to signify out of bounds

// for testing only
const machineParams = {
  'machine_width': 215,
  'machine_depth': 215,
  'machine_height': 300,
  'printable_area': [200, 200],
}

// for testing
// informations about the active machine
window.nativeApi.setMachineParams(machineParams)

/*setTimeout(function () {
  window.nativeApi.setMachineParams(machineParams)
}, 2000)
setTimeout(function () {
  window.nativeApi.setModelUri('http://localhost:8080/data/sanguinololu_enclosure_full.stl')
}, 1000)*/
