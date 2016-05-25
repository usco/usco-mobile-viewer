const vec3 = require('gl-vec3')
const mat4 = require('gl-mat4')

/*
const v3 = vec3.create()
const m4 = mat4.create()*/

export const params = {
  enabled: true,
  userZoom: true,
  userZoomSpeed: 1.0,
  userRotate: true,
  userRotateSpeed: 1.0,

  userPan: true,
  userPanSpeed: 2.0,

  autoRotate: false,
  autoRotateSpeed: 2.0, // 30 seconds per round when fps is 60

  minPolarAngle: 0, // radians
  maxPolarAngle: Math.PI, // radians

  minDistance: 0.2,
  maxDistance: 1400,

  active: false,
  mainPointerPressed: false,

  EPS: 0.000001,
  PIXELS_PER_ROUND: 1800,

  up: [0, 1, 0],

  // ///not sure about theses
  camStates: [
    {
      phiDelta: 0,
      thetaDelta: 0,
      scale: 1,
      lastPosition: [0, 0, 0]
    }
  ],

  centers: [
    [0, 0, 0]
  ],
  objects: [
    {position: [0, 0, 0]}
  ]
}


export function update (params, dt) {
  const {EPS, up} = params
  // this is a modified version, with inverted Y and Z (since we use camera[2] => up)
  // we also allow multiple objects/cameras
  for (var i = 0; i < params.objects.length;i++) {
    var object = params.objects[i]
    var center = params.centers[i]
    var camState = params.camStates[i]

    let curThetaDelta = camState.thetaDelta
    let curPhiDelta = camState.phiDelta
    let curScale = camState.scale
    let lastPosition = camState.lastPosition

    const position = object.position
    // var offset = position.clone().sub(center)
    const offset = vec3.subtract(vec3.create(), position, center)

    let theta
    let phi

    if (up[2] === 1) {
      // angle from z-axis around y-axis, upVector : z
      theta = Math.atan2(offset[0], offset[1])
      // angle from y-axis
      phi = Math.atan2(Math.sqrt(offset[0] * offset[0] + offset[1] * offset[1]), offset[2])
    } else {
      // in case of y up
      theta = Math.atan2(offset[0], offset[2])
      phi = Math.atan2(Math.sqrt(offset[0] * offset[0] + offset[2] * offset[2]), offset[1])
      curThetaDelta = -(curThetaDelta)
    }

    /*if ( params.autoRotate ) {
      //PER camera
      params.objects.map(function(object, index){
        if(scope.objectOptions[index].userRotate){
          scope.camStates[index].thetaDelta += getAutoRotationAngle()
        }
      })
    }*/

    theta += curThetaDelta
    phi += curPhiDelta

    // restrict phi to be between desired limits
    phi = Math.max(params.minPolarAngle, Math.min(params.maxPolarAngle, phi))
    // restrict phi to be betwee EPS and PI-EPS
    phi = Math.max(EPS, Math.min(Math.PI - EPS, phi))
    // multiply by scaling effect
    let radius = vec3.length(offset) * curScale
    // restrict radius to be between desired limits
    radius = Math.max(params.minDistance, Math.min(params.maxDistance, radius))

    if (up[2] === 1) {
      offset[0] = radius * Math.sin(phi) * Math.sin(theta)
      offset[2] = radius * Math.cos(phi)
      offset[1] = radius * Math.sin(phi) * Math.cos(theta)
    } else {
      offset[0] = radius * Math.sin(phi) * Math.sin(theta)
      offset[1] = radius * Math.cos(phi)
      offset[2] = radius * Math.sin(phi) * Math.cos(theta)
    }

    // position.copy(center).add(offset)
    // object.lookAt(center)

    // temporary
    const eye = vec3.create([10, 0, 10])
    vec3.add(vec3.create(), center, offset)
    const objMat = mat4.lookAt(mat4.create(), eye, center, up)

    const positionChanged = vec3.distance(lastPosition, position) > 0 // TODO optimise
    const results = {
      camState: {
        thetaDelta: curThetaDelta / 1.5,
        phiDelta: curPhiDelta / 1.5,
        scale: 1,
        lastPosition: position
      },
      changed: positionChanged,
      object: {
        mat: objMat
      }
    }
    console.log('results', results)
  /*camState.thetaDelta /= 1.5
  camState.phiDelta /= 1.5
  camState.scale = 1*/
  }
}

/*
function setObservables (observables) {
  let {dragMoves$, zooms$} = observables

  let self = this

  // are these useful ?
  //scope.userZoomSpeed = 0.6
  // onPinch
  function zoom (zoomDir, zoomScale, cameras) {
    if (scope.enabled === false) return
    if (scope.userZoom === false) return

    // PER camera
    cameras.map(function (object, index) {
      if (scope.objectOptions[index].userZoom) {
        if (zoomDir < 0) scope.camStates[index].scale /= zoomScale
        if (zoomDir > 0) scope.camStates[index].scale *= zoomScale
      }
    })
  }

  function rotate (cameras, angle) {
    if (scope.enabled === false) return
    if (scope.userRotate === false) return

    // PER camera
    cameras.map(function (object, index) {
      if (scope.objectOptions[index].userRotate) {
        scope.camStates[index].thetaDelta += angle[0]
        scope.camStates[index].phiDelta += angle[1]
      }
    })
  }

  // TODO: implement
  function pan (cameras, offset) {
    // console.log(event)
    var _origDist = distance.clone()

    // do this PER camera
    cameras.map(function (object, index) {
      if (scope.objectOptions[index].userPan) {
        let distance = _origDist.clone()
        distance.transformDirection(object.matrix)
        distance.multiplyScalar(scope.userPanSpeed)
        object.position.add(distance)
        scope.centers[index].add(distance)
      }
    })
  }

  dragMoves$
    .subscribe(function (e) {
      let delta = e.delta
      let angle = {x: 0,y: 0}
      angle[0] = 2 * Math.PI * delta[0] / PIXELS_PER_ROUND * scope.userRotateSpeed
      angle[1] = -2 * Math.PI * delta[1] / PIXELS_PER_ROUND * scope.userRotateSpeed
      rotate(self.objects, angle)
    })

  zooms$
    .subscribe(function (delta) {
      let zoomScale = undefined
      if (!zoomScale) {
        zoomScale = getZoomScale()
      }
      zoom(delta, zoomScale, self.objects)
    })
}*/
