const vec3 = require('gl-vec3')
const mat4 = require('gl-mat4')
/*
const v3 = vec3.create()
const m4 = mat4.create()*/
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
  userZoom: true,
  userZoomSpeed: 1.0,
  userRotate: true,
  userRotateSpeed: 1.0,

  userPan: true,
  userPanSpeed: 2.0,

  autoRotate: true,
  autoRotateSpeed: 2.0, // 30 seconds per round when fps is 60

  minPolarAngle: 0, // radians
  maxPolarAngle: PI, // radians

  minDistance: 0.2,
  maxDistance: 1400,

  active: false,
  mainPointerPressed: false,

  EPS: 0.000001,
  PIXELS_PER_ROUND: 1800,
  drag: 0.01, // Decrease the momentum by 1% each iteration

  // below this, dynamic stuff mostly
  up: [0, 1, 0],

  // not sure about these
  thetaDelta: 0,
  phiDelta: 0,
  scale: 1,

  position: [15, 0, 10],
  target: [0, 0, 0],
  view: mat4.create() // default, this is just a 4x4 matrix

}

export function update (params) {
  // this is a modified version, with inverted Y and Z (since we use camera[2] => up)
  const {EPS, up, position, target, view} = params
  let curThetaDelta = params.thetaDelta
  let curPhiDelta = params.phiDelta
  let curScale = params.scale

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
    curThetaDelta = -(curThetaDelta)
  }

  /*if (params.autoRotate && params.userRotate) {
    scope.camStates[index].thetaDelta += getAutoRotationAngle()
  }*/
  theta += curThetaDelta
  phi += curPhiDelta

  // restrict phi to be between desired limits
  phi = max(params.minPolarAngle, min(params.maxPolarAngle, phi))
  // restrict phi to be betwee EPS and PI-EPS
  phi = max(EPS, min(PI - EPS, phi))
  // multiply by scaling effect and restrict radius to be between desired limits
  const radius = max(params.minDistance, min(params.maxDistance, vec3.length(offset) * curScale))

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

  const positionChanged = vec3.distance(position, newPosition) > 0 // TODO optimise
  const results = {
    changed: positionChanged,

    thetaDelta: curThetaDelta / 1.5,
    phiDelta: curPhiDelta / 1.5,
    scale: curScale,

    position: newPosition,
    target: newTarget,
    view: newView
  }
  // console.log('results', results)
  return results
}

export function rotate (params, angle) {
  if (params.userRotate) {
    params.thetaDelta += angle[0]
    params.phiDelta += angle[1]
  }

  return params
}

export function zoom (params, zoomDir, zoomScale) {
  // are these useful ?
  //scope.userZoomSpeed = 0.6
  /*let zoomScale = undefined
  if (!zoomScale) {
    zoomScale = getZoomScale()
  }*/
  if (params.userZoom) {
    const scale = zoomDir < 0 ? params.scale / zoomScale : params.scale * zoomScale
    params.scale = scale
  }
  return params
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
