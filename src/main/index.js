//perhaps needed for simplicity: npm module
//require('typedarray-methods')
const reglM = require('regl')
// use this one for server side render
// const regl = require('regl')(require('gl')(256, 256))
// use this one for rendering inside a specific canvas/element
// var regl = require('regl')(canvasOrElement)
import prepareRender from './rendering/render'

import { params as cameraDefaults } from '../common/controls/orbitControls'
import camera from '../common/camera'

import { combine, merge, just } from 'most'
import limitFlow from '../common/utils/most/limitFlow'

import loadAsStream from './loader'

// interactions
import controlsStream from '../common/controls/controlsStream'
// import pickStream from '../common/picking/pickStream'

import { interactionsFromEvents, pointerGestures } from '../common/interactions/pointerGestures'
import {elementSize} from '../common/interactions/elementSizing'
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
const {viewerReady, modelLoaded, objectFitsPrintableVolume, machineParamsLoaded} = makeInterface()
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

const modelUri$ = merge(
  adressBarDriver,
  nativeApi.modelUri$
)
  .flatMapError(function (error) {
    // console.log('error', error)
    modelLoaded(false) // error)
    return just(null)
  })
  .filter(x => x !== null)
  .multicast()


const setMachineParams$ = merge(
  nativeApi.machineParams$
)
  .flatMapError(function (error) {
    // console.log('error', error)
    machineParamsLoaded(false) // error)
    return just(null)
  })
  .filter(x => x !== null)
  .tap(e => machineParamsLoaded(true))
  .multicast()

const parsedSTL$ = modelUri$
  .flatMap(loadAsStream)
  .flatMapError(function (error) {
    modelLoaded(false) // error)
    return just(undefined)
  })
  .filter(x => x !== undefined)
  .multicast()

const render = prepareRender(regl)
const addEntities$ = entityPrep(parsedSTL$)
const setEntityBoundsStatus$ = merge(setMachineParams$, addEntities$.sample((x) => x, setMachineParams$))

const entities$ = makeEntitiesModel({addEntities: addEntities$, setEntityBoundsStatus: setEntityBoundsStatus$})
const machine$ = makeMachineModel({setMachineParams: setMachineParams$})

const appState$ = makeState(machine$, entities$)
  .forEach(x => x)

// interactions : camera controls
const baseInteractions$ = interactionsFromEvents(container)
const gestures = pointerGestures(baseInteractions$)
const focuses$ = addEntities$.map(function (nEntity) {
  const mid = nEntity.bounds.max.map(function (pos, idx) {
    return pos - nEntity.bounds.min[idx]
  })
  return mid
})

const entityFocuses$ = addEntities$
const projection$ = elementSize(container)
/*baseInteractions$.taps
focuses.forEach(e=>console.log('tapping'))*/
const camState$ = controlsStream({gestures}, {settings: cameraDefaults, camera}, focuses$, entityFocuses$, projection$)

const visualState$ = makeVisualState(regl, machine$, entities$, camState$)
  .multicast()
  .flatMapError(function (error) {
    console.error('error in visualState', error)
    return just(null)
  })
  .filter(x => x !== null)

visualState$
  .thru(limitFlow(33))
  .tap(x => regl.poll())
  .tap(render)
  .flatMapError(function (error) {
    console.error('error in render', error)
    return just(null)
  })
  .forEach(x => x)

// boundsExceeded
const objectFitsPrintableVolume$ = combine(function (entity, machineParams) {
  // console.log('objectFitsPrintableArea', entity, machineParams)
  return !isObjectOutsideBounds(machineParams, entity)
}, addEntities$, setMachineParams$)
  .tap(e => console.log('objectFitsPrintableVolume??', e))
  .multicast()

viewerReady()

// OUTPUTS (sink side effects)
addEntities$.forEach(m => modelLoaded(true)) // side effect => dispatch to callback)
objectFitsPrintableVolume$.forEach(objectFitsPrintableVolume) // dispatch message to signify out of bounds or not


// for testing only
const machineParams = {
  'name': 'ultimaker3_extended',
  'machine_width': 215,
  'machine_depth': 215,
  'machine_height': 300,
  'printable_area': [200, 200]
}

// for testing
// informations about the active machine
window.nativeApi.setMachineParams(machineParams)

/*setTimeout(function () {
  window.nativeApi.setMachineParams(machineParams)
}, 2000)
setTimeout(function () {
  window.nativeApi.setModelUri( 'http://localhost:8080/data/sanguinololu_enclosure_full.stl')
}, 50)*/
