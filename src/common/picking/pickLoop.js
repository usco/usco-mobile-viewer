import mat4 from 'gl-mat4'

import pick from 'camera-picking-ray'

import intersect from './intersect'

import { fromEvent } from 'most'

export default function pickLoop (targetEl, fullData) {
  fromEvent('mousemove', targetEl)
    .map(e=>({x:e.clientX, y: e.clientY, buttons:[]}))
    .forEach(d=>onMouseChange(d.buttons, d.x, d.y, fullData))
    //.forEach(e => console.log('mousemove', e))
}

function onMouseChange (buttons, x, y, fullData) {
  /*if (buttons !== 1) {
    return
  }*/
  // console.log('mouse-change', fullData, buttons, x, y, mods)

  // Picking
  let screenWidth = window.innerWidth
  let screenHeight = window.innerHeight

  // your camera matrices
  var projection = mat4.perspective([],
    Math.PI / 4,
    screenWidth / screenHeight,
    0.01,
    1000)
  var view = fullData.camera.view
  var projView = mat4.multiply([], projection, view)
  var invProjView = mat4.invert([], projView)

  let ray = { // this data will get mutated to contain data
    ro: [0, 0, 0],
    rd: [0, 0, 0]
  }

  let mouse = [0, 0]
  let viewport = [0, 0, 320, 240]

  mouse = [x, y] // screenHeight -
  viewport = [ 0, 0, screenWidth, screenHeight ]

  // warning !!! posible issues with camera-unproject , itself used in other modules https://github.com/Jam3/camera-unproject/issues/1

  // store result in ray (origin, direction)
  pick(ray.ro, ray.rd, mouse, viewport, invProjView)

  fullData.entities
    .filter(e => e.meta.pickable)
    .map(function (entity, index) {
      return intersect(ray, entity, index)
    })
    .filter(h => h !== null)
    .forEach(hit => console.log('hit', hit.entity.id, hit))
}

export function pickLoop_old (fullData) {
  require('mouse-change')(onMouseChange)
}
