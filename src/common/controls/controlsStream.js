import { update, rotate, zoom } from './orbitControls'

import most from 'most'
import { sample } from 'most'
import { fromEvent, combineArray, combine, mergeArray } from 'most'
import { interactionsFromEvents, pointerGestures } from '../interactions/pointerGestures'

import { model } from '../utils/modelUtils'
import animationFrames from '../utils/animationFrames'

export default function controlsStream (interactions, cameraData) {
  const {settings, camera} = cameraData
  const {gestures} = interactions

  const rate$ = animationFrames() //heartBeat
  //const heartBeat$ = most.periodic(16, 'x')
  //sample(world, rate)

  const mobileReductor = 5.0 // how much we want to divide touch deltas to get movements on mobile

  const dragMoves$ = gestures.dragMoves
    //.throttle(16) // FIXME: not sure, could be optimized some more
    .filter(x => x !== undefined)
    .map( function(data) {
      let delta = [data.delta.x,data.delta.y]
      if(data.type === 'touch'){
        delta = delta.map(x=>x/mobileReductor)
      }
      return delta
    })
    .map(function (delta) {
      const angle = [- Math.PI * delta[0],  - Math.PI * delta[1]]
      return angle
    })

  const zooms$ = gestures.zooms
    .map(x => -x) // we invert zoom direction
    .startWith(0)
    .filter(x => !isNaN(x))
    .throttle(10)

  function makeCameraModel () {
    function applyRotation (state, angles) {
      state = rotate(settings, state, angles) // mutating, meh
      //state = update(settings, state) // not sure
      return state
    }

    function applyZoom (state, zooms) {
      //console.log('applyZoom', zooms)
      state = zoom(settings, state, zooms) // mutating, meh
      state = update(settings, state) // not sure
      return state
    }

    function updateState (state) {
      return update(settings, state)
    }

    const updateFunctions = {applyZoom, applyRotation, updateState}
    const actions = {applyZoom: zooms$, applyRotation: dragMoves$, updateState: rate$}

    const cameraState$ = model(camera, actions, updateFunctions)

    return cameraState$
    return most.merge(
      cameraState$.take(2),
      cameraState$
    )
  }

  const cameraState$ = makeCameraModel()

  return cameraState$
    .sample(x=>x, rate$)
    .filter(x => x.changed)
    .merge(cameraState$)
}
