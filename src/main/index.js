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
import { makeEntitiesModel, makeMachineModel } from './state'
import { makeVisualState } from './visualState'

// basic api
import makeInterface from '../common/mobilePlatforms/interface'
import nativeApiDriver from './sideEffects/nativeApiDriver'

// ////////////
const {onLoadModelError, onLoadModelSuccess, onBoundsExceeded, onViewerReady, onMachineParamsError} = makeInterface()
const nativeApi = nativeApiDriver()

const regl = reglM({
  extensions: [
    'oes_texture_float', // FIXME: for shadows, is it widely supported ?
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

/////////
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
  .multicast()

const parsedSTL$ = modelUri$
  .flatMap(loadAsStream)
  .tap(e => console.log('done loading', e))
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

const entities$ = makeEntitiesModel({addEntities: addEntities$})
const machine$ = makeMachineModel({setMachineParams: setMachineParams$})

const appState$ = combineArray(
  function (entities, machine) {
    return {entities, machine}
  }, [entities$, machine$])

const visualState$ = makeVisualState(regl, machine$, entities$, camState$)
  .thru(limitFlow(33))
  .tap(x => regl.poll())
  .forEach(x => render(x))

// boundsExceeded
const boundsExceeded$ = combine(function (entity, machineParams) {
  console.log('boundsExceeded', entity, machineParams)
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
  'machine_width': { 'default_value': 215 },
  'machine_depth': { 'default_value': 215 },
  'machine_height': { 'default_value': 300 },
  'machine_head_with_fans_polygon': {'default_value': [
      [-40, 10],
      [-40, -30],
      [60, 10],
      [60, -30]
  ]},
  'machine_disallowed_areas': { 'default_value': [
      [[-91.5, -115], [-115, -115], [-115, -104.6], [-91.5, -104.6]],
      [[-99.5, -104.6], [-115, -104.6], [-115, 104.6], [-99.5, 104.6]],
      [[-94.5, 104.6], [-115, 104.6], [-115, 105.5], [-94.5, 105.5]],
      [[-91.4, 105.5], [-115, 105.5], [-115, 115], [-91.4, 115]],

      [[77.3, -115], [77.3, -98.6], [115, -98.6], [115, -115]],
      [[97.2, -98.6], [97.2, -54.5], [113, -54.5], [113, -98.6]],
      [[100.5, -54.5], [100.5, 99.3], [115, 99.3], [115, -54.5]],
      [[77, 99.3], [77, 115], [115, 115], [115, 99.3]]
  ]},
  'prime_tower_position_x': { 'default_value': 180 }
}
// for testing
// informations about the active machine
window.nativeApi.setMachineParams(machineParams)
