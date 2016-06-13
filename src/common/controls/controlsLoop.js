import { update, rotate, zoom } from './orbitControls'

import { fromEvent, combineArray, combine } from 'most'

export default function loop (targetEl, cameraDefaults, render, fullData) {
  const mouseDowns$ = fromEvent('mousedown', targetEl)
    .map(e => e.buttons)
    .startWith([])
    //.forEach(e => console.log('mouseDowns', e))

  const mouseMoves$ = fromEvent('mousemove', targetEl)
    .map(e => ({x: e.clientX, y: e.clientY}))
    .startWith({x:undefined, y:undefined})
    //.forEach(e => console.log('mousemove', e))

  const mouseWheels$ = fromEvent('mousewheel', targetEl)
    .startWith(undefined)
    //.forEach(e => console.log('mousewheel', e))

  combine(function(down,move,wheel){
    return {x:move.x, y:move.y, buttons:down}
  }, mouseDowns$, mouseMoves$, mouseWheels$)
    .forEach(e => console.log('combined', e))

  let camera = update(cameraDefaults)
  let data = fullData
  data.camera = camera
  render(data)
}

export function loopOld (cameraDefaults, render, fullData) {
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
