import { update, rotate, zoom, setFocus } from './orbitControls'
import { fromEvent, combineArray, combine, mergeArray } from 'most'
import { interactionsFromEvents, pointerGestures } from '../interactions/pointerGestures'

import { model } from '../utils/modelUtils'
import animationFrames from '../utils/animationFrames'

export default function controlsStream (interactions, cameraData, focuses$) {
  const {settings, camera} = cameraData
  const {gestures} = interactions

  const rate$ = animationFrames() // heartBeat

  const dragMoves$ = gestures.dragMoves
    // .throttle(16) // FIXME: not sure, could be optimized some more
    .filter(x => x !== undefined)
    .map(function (data) {
      let delta = [data.delta.x, data.delta.y]
      if (data.type === 'touch') {
        // delta = delta.map(x => x / mobileReductor)
      }
      return delta
    })
    .map(function (delta) {
      const angle = [-Math.PI * delta[0], -Math.PI * delta[1]]
      return angle
    })
    .map(x => x.map(y => y * 0.1)) // empirical reduction factor
    .map(x => x.map(y => y * window.devicePixelRatio))

  const zooms$ = gestures.zooms
    .map(x => -x) // we invert zoom direction
    .startWith(0)
    .filter(x => !isNaN(x))
    .throttle(10)

  // model/ state/ reducers
  function makeCameraModel () {
    function applyRotation (state, angles) {
      state = rotate(settings, state, angles) // mutating, meh
      state = update(settings, state) // not sure
      return state
    }

    function applyZoom (state, zooms) {
      // console.log('applyZoom', zooms)
      state = zoom(settings, state, zooms) // mutating, meh
      state = update(settings, state) // not sure
      return state
    }

    function applyFocusOn (state, focuses) {
      state = setFocus(settings, state, focuses) // mutating, meh
      state = update(settings, state) // not sure
      return state
    }

    function zoomToFit (state, zoomsToFit) {
      //params, cameraState, focusPoint
      const sub = (a, b) => a.map((a1, i) => a1 - b[i])
      const add = (a, b) => a.map((a1, i) => a1 + b[i])
      const camTarget = state.target
      const diff = sub(focusPoint, camTarget) // [ focusPoint[0] - camTarget[0],
      const zOffset = [0, 0, diff[2] * 0.5]
      state.target = add(camTarget, zOffset)
      state.position = add(state.position, zOffset)

      state = update(settings, state) // not sure

      return state
    }


    function updateState (state) {
      return update(settings, state)
    }

    const updateFunctions = {applyZoom, applyRotation, updateState, applyFocusOn}
    const actions = {applyZoom: zooms$, applyRotation: dragMoves$, updateState: rate$, applyFocusOn: focuses$}

    const cameraState$ = model(camera, actions, updateFunctions)

    return cameraState$
  }

  const cameraState$ = makeCameraModel()

  return rate$.sample(x => x,
    cameraState$
      .filter(x => x.changed)
      .merge(cameraState$.take(1))
    )
    //.tap(e=>console.log('cameraState',e))
}
