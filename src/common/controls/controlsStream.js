import { update, rotate, zoom, setFocus } from './orbitControls'
import computeCameraToFitBounds from '../cameraEffects/computeCameraToFitBounds'

import { model } from '../utils/modelUtils'
import animationFrames from '../utils/animationFrames'

import mat4 from 'gl-mat4'

export default function controlsStream (interactions, cameraData, focuses$, entityFocuses$, projection$) {
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
    function setProjection (state, input) {
      const projection = mat4.perspective([], state.fov, input.width / input.height, // context.viewportWidth / context.viewportHeight,
        state.near,
        state.far)
      //state = Object.assign({}, state, {projection})
      state.projection = projection
      state = Object.assign({}, state, update(settings, state)) // not sure
      return state
    }

    function applyRotation (state, angles) {
      state = rotate(settings, state, angles) // mutating, meh
      state = Object.assign({}, state, update(settings, state)) // not sure
      return state
    }

    function applyZoom (state, zooms) {
      // console.log('applyZoom', zooms)
      state = zoom(settings, state, zooms) // mutating, meh
      state = Object.assign({}, state, update(settings, state)) // not sure
      return state
    }

    function applyFocusOn (state, focuses) {
      state = setFocus(settings, state, focuses) // mutating, meh
      state = Object.assign({}, state, update(settings, state)) // not sure
      return state
    }

    function zoomToFit (state, input) {
      console.log('zoomToFit', input)
      const {position, target} = computeCameraToFitBounds(state, input.bounds)
      state.target = target
      state.position = position
      // state = update(settings, state) // not sure

      const focuses = [input].map(function (nEntity) {
        const mid = nEntity.bounds.max.map(function (pos, idx) {
          return pos - nEntity.bounds.min[idx]
        })
        return mid
      })[0]
      state = setFocus(settings, state, focuses) // mutating, meh
      // state = update(settings, state) // not sure

      return state
    }

    function updateState (state) {
      return Object.assign({}, state, update(settings, state))
    }

    const updateFunctions = {applyZoom, applyRotation, updateState, applyFocusOn, zoomToFit, setProjection}
    const actions = {
      setProjection: projection$,
      applyZoom: zooms$,
      applyRotation: dragMoves$,
      updateState: rate$,
      applyFocusOn: focuses$,
    zoomToFit: entityFocuses$}

    const cameraState$ = model(camera, actions, updateFunctions)

    return cameraState$
  }

  const cameraState$ = makeCameraModel()

  return rate$.sample(x => x,
    cameraState$
      .filter(x => x.changed)
      .merge(cameraState$.take(1))
  )
}
