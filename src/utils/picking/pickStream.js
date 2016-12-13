import mat4 from 'gl-mat4'
import pick from 'camera-picking-ray'

import intersect from './intersect'

import {merge } from 'most'

export default function pickStream (interactions, data) {
  const {gestures} = interactions
  const viewport = [ 0, 0, window.innerWidth, window.innerHeight ]

  return merge(
      gestures.taps.shortSingleTaps$
      //,gestures.pointerMoves
    )
    .map(function (event) {
      const pointer = {
        position: [event.offsetX, event.offsetY]
      }
      return tryToPick(pointer, viewport, data)
    })
    .tap(e => console.log('picking, single taps', e))
}

function tryToPick (pointer, viewport, fullData) {
  // warning !!! posible issues with camera-unproject , itself used in other modules https://github.com/Jam3/camera-unproject/issues/1

  const viewportWidth = viewport[2]
  const viewportHeight = viewport[3]

  // your camera matrices
  const projection = mat4.perspective([],
    Math.PI / 4,
    viewportWidth / viewportHeight,
    0.01,
    1000)
  var view = fullData.camera.view
  var projView = mat4.multiply([], projection, view)
  var invProjView = mat4.invert([], projView)

  let ray = { // this data will get mutated to contain data
    ro: [0, 0, 0],
    rd: [0, 0, 0]
  }

  // store result in ray (origin, direction)
  pick(ray.ro, ray.rd, pointer.position, viewport, invProjView)

  return fullData.entities
    .filter(e => e.meta.pickable)
    .map(function (entity, index) {
      return intersect(ray, entity, index)
    })
    .filter(h => h !== null)
    .concat([])
}
