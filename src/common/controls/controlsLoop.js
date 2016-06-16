import { update, rotate, zoom } from './orbitControls'

import most from 'most'
import { fromEvent, combineArray, combine } from 'most'

import { interactionsFromEvents, pointerGestures } from '../interactions/pointerGestures'

export function controlsLoop (targetEl, cameraDefaults, fullData) {
  const interactions$ = interactionsFromEvents(targetEl)
  const gestures = pointerGestures(interactions$)
  console.log('pointerGestures', gestures)
  // gestures.taps.taps$.forEach(e=>console.log('taps',e))
  gestures.taps.shortSingleTaps$.forEach(e => console.log('shortSingleTaps', e))
  gestures.taps.shortDoubleTaps$.forEach(e => console.log('shortDoubleTaps', e))
  gestures.taps.longTaps$.forEach(e => console.log('longTaps', e))

  const dragMoves$ = gestures.dragMoves
    .map(function (moveData) {
      const delta = [moveData.delta.left, moveData.delta.top]
      let angle = [0, 0]
      angle[0] = 2 * Math.PI * delta[0] / 1800 * 2.0
      angle[1] = -2 * Math.PI * delta[1] / 1800 * 2.0
      return angle
    }).startWith([0, 0])
    //.scan((acc, cur) => [cur[0]-acc[0], cur[1]-acc[1]], [0, 0])

  const zooms$ = gestures.zooms
    .map(x=>-x)
    .scan((acc, cur) => acc + cur, 0)
    .startWith(0)

  const res$ = most.combine(function (angles, zooms) {
    return {angles, zooms}
  }, dragMoves$, zooms$)
    .scan(function (state, current) {
      const {angles, zooms} = current
      console.log('here', angles)

      let camera = update(cameraDefaults)
      camera = Object.assign({}, cameraDefaults, {camera})
      camera = zoom(camera, zooms)
      camera = Object.assign({}, cameraDefaults, {camera})
      camera = rotate(camera, angles)

      camera = Object.assign({}, cameraDefaults, {camera})
      camera = update(camera)

      let data = fullData
      data.camera = camera
      return data
    }, undefined)
    .filter(x => x !== undefined)
    /*.map(function (camera) {
      // console.log('camera', camera)
      camera = Object.assign({}, cameraDefaults, {camera})
      camera = update(camera)
      let data = fullData
      data.camera = camera
      return data
    })*/

  return res$

  /*function updateStep () {
    camera = Object.assign({}, cameraDefaults, {camera})
    camera = update(camera)

    if (camera && camera.changed) {
      let data = fullData
      data.camera = camera
      render(data)
    }
    window.requestAnimationFrame(updateStep)
  }*/

}

export function controlsLoopOld (cameraDefaults, render, fullData) {
  // FIXME: hack for now
  let camera = update(cameraDefaults)
  let prevMouse = [0, 0]

  function onMouseChange (buttons, x, y, mods) {
    // console.log('mouse-change', buttons, x, y, mods)
    if (buttons === 1) {
      let delta = [x - prevMouse[0], y - prevMouse[1]]
      let angle = [0, 0]
      angle[0] = 2 * Math.PI * delta[0] / 1800 * 2.0
      angle[1] = -2 * Math.PI * delta[1] / 1800 * 2.0

      camera = Object.assign({}, cameraDefaults, {camera})
      camera = rotate(camera, angle)
    }
    prevMouse = [x, y]
  }

  function onMouseWheel (dx, dy) {
    const zoomDelta = dy
    camera = Object.assign({}, cameraDefaults, {camera})
    camera = zoom(camera, zoomDelta)
  }

  function updateStep () {
    camera = Object.assign({}, cameraDefaults, {camera})
    camera = update(camera)

    if (camera && camera.changed) {
      let data = fullData
      data.camera = camera
      render(data)
    }
    window.requestAnimationFrame(updateStep)
  }

  require('mouse-change')(onMouseChange)
  require('mouse-wheel')(onMouseWheel)

  let data = fullData
  data.camera = camera
  render(data)

  requestAnimationFrame(updateStep)
}
