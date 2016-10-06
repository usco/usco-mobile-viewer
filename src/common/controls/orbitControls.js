const vec3 = require('gl-vec3')
const mat4 = require('gl-mat4')
const {max, min, sqrt, PI, sin, cos, atan2} = Math

/* cameras are assumed to have:
 projection
 view
 target (focal point)
 eye/position
 up
*/
export const params = {
  enabled: true,
  userControl: {
    zoom: true,
    zoomSpeed: 1.0,
    rotate: true,
    rotateSpeed: 1.0,
    pan: true,
    panSpeed: 2.0
  },
  autoRotate: {
    enabled: false,
    speed: 2.0 // 30 seconds per round when fps is 60
  },
  limits: {
    minDistance: 0.2,
    maxDistance: 400
  },
  EPS: 0.000001,
  drag: 0.47, // Decrease the momentum by 1% each iteration

  up: [0, 0, 1]
}

export function update (settings, state) {
  // custom z up is settable, with inverted Y and Z (since we use camera[2] => up)
  const camera = state
  const {EPS, up, drag} = settings
  const {position, target, view} = camera
  let curThetaDelta = camera.thetaDelta
  let curPhiDelta = camera.phiDelta
  let curScale = camera.scale

  let offset = vec3.subtract(vec3.create(), position, target)
  let theta
  let phi

  if (up[2] === 1) {
    // angle from z-axis around y-axis, upVector : z
    theta = atan2(offset[0], offset[1])
    // angle from y-axis
    phi = atan2(sqrt(offset[0] * offset[0] + offset[1] * offset[1]), offset[2])
  } else {
    // in case of y up
    theta = atan2(offset[0], offset[2])
    phi = atan2(sqrt(offset[0] * offset[0] + offset[2] * offset[2]), offset[1])
  // curThetaDelta = -(curThetaDelta)
  }

  if (params.autoRotate.enabled && params.userControl.rotate) {
    curThetaDelta += 2 * Math.PI / 60 / 60 * params.autoRotate.speed // arbitrary, kept for backwards compatibility
  }

  theta += curThetaDelta
  phi += curPhiDelta

  // restrict phi to be betwee EPS and PI-EPS
  phi = max(EPS, min(PI - EPS, phi))
  // multiply by scaling effect and restrict radius to be between desired limits
  const radius = max(params.limits.minDistance, min(params.limits.maxDistance, vec3.length(offset) * curScale))

  if (up[2] === 1) {
    offset[0] = radius * sin(phi) * sin(theta)
    offset[2] = radius * cos(phi)
    offset[1] = radius * sin(phi) * cos(theta)
  } else {
    offset[0] = radius * sin(phi) * sin(theta)
    offset[1] = radius * cos(phi)
    offset[2] = radius * sin(phi) * cos(theta)
  }

  const newPosition = vec3.add(vec3.create(), target, offset)
  const newTarget = target
  const newView = mat4.lookAt(view, newPosition, target, up)
  /* mat3.fromMat4(camMat, camMat)
  quat.fromMat3(this.rotation, camMat)
  lookAt(view, this.position, this.target, this.up)
  */
  const dragEffect = 1 - max(min(drag, 1.0), 0.01)

  const positionChanged = vec3.distance(position, newPosition) > 0 // TODO optimise
  return {
    changed: positionChanged,
    thetaDelta: curThetaDelta * dragEffect,
    phiDelta: curPhiDelta * dragEffect,
    scale: 1,

    position: newPosition,
    target: newTarget,
    view: newView
  }
}

export function rotate (params, cameraState, angle) {
  const reductionFactor = 500
  if (params.userControl.rotate) {
    cameraState.thetaDelta += (angle[0] / reductionFactor)
    cameraState.phiDelta += (angle[1] / reductionFactor)
  }

  return cameraState
}

export function zoom (params, cameraState, zoomScale) {
  if (params.userControl.zoom) {
    zoomScale = zoomScale * 0.001 // Math.min(Math.max(zoomScale, -0.1), 0.1)
    const amount = Math.abs(zoomScale) === 1 ? Math.pow(0.95, params.userControl.zoomSpeed) : zoomScale
    const scale = zoomScale < 0 ? (cameraState.scale / amount) : (cameraState.scale * amount)
    // console.log('zoomScale',zoomScale,scale)

    cameraState.scale += amount
  }
  return cameraState
}

function pan (params) {
  // TODO: implement
  /*let distance = _origDist.clone()
  distance.transformDirection(object.matrix)
  distance.multiplyScalar(scope.userPanSpeed)
  object.position.add(distance)
  scope.centers[index].add(distance)*/
  return params
}

/*
function setObservables (observables) {
  let {dragMoves$, zooms$} = observables
  dragMoves$
    .subscribe(function (e) {
      let delta = e.delta
      let angle = {x: 0,y: 0}
      angle[0] = 2 * Math.PI * delta[0] / PIXELS_PER_ROUND * scope.userRotateSpeed
      angle[1] = -2 * Math.PI * delta[1] / PIXELS_PER_ROUND * scope.userRotateSpeed
      rotate(self.objects, angle)
    })
}*/
