import { update, rotate, zoom, setFocus } from './orbitControls'
import computeCameraToFitBounds from '../cameraEffects/computeCameraToFitBounds'
import cameraOffsetToEntityBoundsCenter from '../cameraEffects/cameraOffsetToEntityBoundsCenter'

import { model } from '../utils/modelUtils'
import {animationFrames, rafStream} from '../utils/most/animationFrames'

import mat4 from 'gl-mat4'
import limitFlow from '../utils/most/limitFlow'

export default function controlsStream (interactions, cameraData, focuses$, entityFocuses$, projection$) {
  const {settings, camera} = cameraData
  const {gestures} = interactions

  const rate$ = rafStream() // heartBeat

  let i = 0
  var newdiv = document.createElement("DIV")
  newdiv.style.zIndex = 99
  newdiv.style.position = 'absolute'
  newdiv.style.color = 'red'
  newdiv.style.top = '40px'
  let textNode = document.createTextNode("some text"+i)
  newdiv.appendChild(textNode)
  document.body.appendChild(newdiv)

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
      //state = Object.assign({}, state, update(settings, state)) // not sure
      return state
    }

    function applyRotation (state, angles) {
      textNode.nodeValue= 'applyRotation'

      state = rotate(settings, state, angles) // mutating, meh
      //state = Object.assign({}, state, update(settings, state)) // not sure
      return state
    }

    function applyZoom (state, zooms) {
      // console.log('applyZoom', zooms)
      textNode.nodeValue= 'applyZoom'
      state = zoom(settings, state, zooms) // mutating, meh
      //state = Object.assign({}, state, update(settings, state)) // not sure
      return state
    }

    function applyFocusOn (state, focuses) {
      state = setFocus(settings, state, focuses) // mutating, meh
      //state = Object.assign({}, state, update(settings, state)) // not sure
      return state
    }

    function zoomToFit (state, input) {
      console.log('zoomToFit', state.position, state.target,  input)
      let camera = state
      const {bounds, transforms} = input
      const offsetTargetAndPosition = cameraOffsetToEntityBoundsCenter({camera, bounds, transforms, axis: 2})
      camera = Object.assign({}, state, offsetTargetAndPosition)
      const phase2 = computeCameraToFitBounds({camera, bounds, transforms})
      state.targetTgt = phase2.target
      state.positionTgt = phase2.position
      return state
    }

    //this is used for 'continuous updates' for things like spin effects, autoRotate etc
    function updateState (state) {
      //i++
      //textNode.nodeValue= 'foo'+i
      //return state
      return Object.assign({}, state, update(settings, state))
    }

    const updateFunctions = {
      setProjection,
      applyZoom,
      applyRotation,
      //applyFocusOn,
      zoomToFit,
      updateState
    }
    const actions = {
      setProjection: projection$,
      applyZoom: zooms$,
      applyRotation: dragMoves$,
      //applyFocusOn: focuses$,
      zoomToFit: entityFocuses$,
      updateState: rate$
    }

    const cameraState$ = model(camera, actions, updateFunctions)

    return cameraState$
  }

  const cameraState$ = makeCameraModel()

  return cameraState$
    .thru(limitFlow(33))
  /*return rate$.sample(x => x,
    cameraState$
      .filter(x => x.changed)
      .merge(cameraState$.take(1))
  )*/
}
