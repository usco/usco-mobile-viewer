import { update, rotate, zoom } from '../common/orbitControls'

export default function loop(cameraDefaults, render, fullData){
  // FIXME: hack for now
  let cameraData = update(cameraDefaults)
  let prevMouse = [0, 0]

  function onMouseChange (buttons, x, y, mods) {
    // console.log('mouse-change', buttons, x, y, mods)
    if(buttons === 1) {
      let delta = [x - prevMouse[0], y - prevMouse[1]]
      let angle = [0, 0]
      angle[0] = 2 * Math.PI * delta[0] / 1800 * 2.0
      angle[1] = -2 * Math.PI * delta[1] / 1800 * 2.0

      cameraData = Object.assign({}, cameraDefaults, {cam: cameraData})
      cameraData = rotate(cameraData, angle)
    }
    prevMouse = [x, y]
  }

  function onMouseWheel (dx, dy) {
    const zoomDelta = dy
    cameraData = Object.assign({}, cameraDefaults, {cam: cameraData})
    cameraData = zoom(cameraData, zoomDelta)
  }

  function updateStep () {
    cameraData = Object.assign({}, cameraDefaults, {cam: cameraData})
    cameraData = update(cameraData)

    if (cameraData && cameraData.changed) {
      let data = fullData
      data.cameraData = cameraData
      render(data)
    }
    window.requestAnimationFrame(updateStep)
  }

  require('mouse-change')(onMouseChange)
  require('mouse-wheel')(onMouseWheel)

  //
  let data = fullData
  data.cameraData = cameraData
  render(data)

  requestAnimationFrame(updateStep)
}
