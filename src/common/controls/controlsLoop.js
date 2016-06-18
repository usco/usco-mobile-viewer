import { update, rotate, zoom } from './orbitControls'

import most from 'most'
import { fromEvent, combineArray, combine, mergeArray } from 'most'
import { interactionsFromEvents, pointerGestures } from '../interactions/pointerGestures'

import { model } from '../utils/modelUtils'

export function controlsLoop (targetEl, cameraData, fullData) {
  const {settings, camera} = cameraData

  const interactions$ = interactionsFromEvents(targetEl)
  const gestures = pointerGestures(interactions$)
  console.log('controlsLoop', cameraData)
  // gestures.taps.taps$.forEach(e=>console.log('taps',e))
  gestures.taps.shortSingleTaps$.forEach(e => console.log('shortSingleTaps', e))
  gestures.taps.shortDoubleTaps$.forEach(e => console.log('shortDoubleTaps', e))
  gestures.taps.longTaps$.forEach(e => console.log('longTaps', e))

  const heartBeat$ = most.periodic(20, 'x')

  const dragMoves$ = gestures.dragMoves
    .loop(function (acc, moveData) {
      const delta = !acc ? [0, 0] : [acc.mouseEvent.offsetX - moveData.mouseEvent.offsetX, moveData.mouseEvent.offsetY - acc.mouseEvent.offsetY] // [moveData.delta.left, moveData.delta.top]
      return {seed: moveData, value: delta}
    }, undefined).startWith([0, 0])
    .filter(x => x !== undefined)
    .map(function (delta) {
      const angle = [Math.PI * delta[0], - Math.PI * delta[1]]
      console.log('angle', angle)
      return angle
    })
    // .scan((acc, cur) => [cur[0]-acc[0], cur[1]-acc[1]], [0, 0])

  const zooms$ = gestures.zooms
    .map(x => -x) // we invert zoom direction
    .startWith(0)

  function makeCameraModel () {
    function applyRotation (state, angles) {
      state = rotate(settings, state, angles) // mutating, meh
      state = update(settings, state) // not sure
      return state
    }

    function applyZoom (state, zooms) {
      state = zoom(settings, state, zooms) // mutating, meh
      state = update(settings, state) // not sure
      return state
    }

    function updateState (state) {
      return update(settings, state)
    }

    const updateFunctions = {applyZoom, applyRotation, updateState}
    const actions = {applyZoom: zooms$, applyRotation: dragMoves$, updateState: heartBeat$}

    const cameraState$ = model(camera, actions, updateFunctions)
     //.map(cameraState => update(settings, cameraState))
    return cameraState$
  }

  const cameraState$ = makeCameraModel()
    .filter(x => x.changed)
    .map(updateCompleteState)

  function updateCompleteState (cameraState) {
    let data = fullData
    data.camera = cameraState
    return data
  }

  // const updateForRender$ = most.sample(updateCompleteState, heartBeat$, cameraState$)
  // return updateForRender$

  /*const cameraState$ = most.combine(function (angles, zooms) {
    return {angles, zooms}
  }, dragMoves$, zooms$)
    .scan(function (state, current) {
      const {angles, zooms} = current
      // console.log('delta', angles)

      let cameraState = update(settings, camera)
      cameraState = zoom(settings, cameraState, zooms) // mutating, meh
      cameraState = rotate(settings, cameraState, angles)
      cameraState = update(settings, cameraState)

      let data = fullData
      data.camera = cameraState
      return data
    }, undefined)
    .filter(x => x !== undefined)*/

  return cameraState$
}

export function controlsLoopOld (cameraDefaults, render, fullData) {
  const {settings, camera} = cameraDefaults
  // FIXME: hack for now
  let cameraState = update(settings, camera)
  let prevMouse = [0, 0]

  function onMouseChange (buttons, x, y, mods) {
    // console.log('mouse-change', buttons, x, y, mods)
    if (buttons === 1) {
      let delta = [x - prevMouse[0], y - prevMouse[1]]
      let angle = [0, 0]
      angle[0] = 2 * Math.PI * delta[0] / 1800 * 2.0
      angle[1] = -2 * Math.PI * delta[1] / 1800 * 2.0

      cameraState = rotate(settings, cameraState, angle)
    }
    prevMouse = [x, y]
  }

  function onMouseWheel (dx, dy) {
    const zoomDelta = dy
    cameraState = zoom(settings, cameraState, zoomDelta)
  }

  function updateStep () {
    cameraState = update(settings, cameraState)

    if (cameraState && cameraState.changed) {
      let data = fullData
      data.camera = cameraState
      render(data)
    }
    window.requestAnimationFrame(updateStep)
  }

  require('mouse-change')(onMouseChange)
  require('mouse-wheel')(onMouseWheel)

  let data = fullData
  data.camera = cameraState
  render(data)

  requestAnimationFrame(updateStep)
}
