import vec3 from 'gl-vec3'

//import TWEEN from 'tween.js'
import assign from 'fast.js/object/assign' // faster object.assign

export default function zoomInOn (options, camera, target) {
  const defaults = {
    position: undefined, // to force a given "point " vector to zoom in on
    distance: 3,
    zoomTime: 400,
    precision: 0.001
  }

  if (!target || !camera) return

  let {position, distance, zoomTime, precision} = assign({}, defaults, options)
  // console.log("ZoomInOnObject", targetObject,options)

  if (!position) {
    distance = target.bounds.radius * distance
    position = target.transforms.pos
  } else {
    distance = vec3.length(vec3.subtract(vec3.create(), position, target.transforms.pos)) * distance * 2
  }

  let camPos = camera.position
  let camTgt = (camera.target || vec3.create())

  let camTgtTarget = position
  let camPosTarget = vec3.subtract(vec3.create(), camera.position, position) // camera.position.clone().sub(position)

  // determin camera "look-at" vector
  let camLookatVector = vec3.create(0, 0, 1)
  let camQuaternion = ''
  camLookatVector = vec3.transformQuat(camLookatVector, camLookatVector, camera.quaternion) // camLookatVector.applyQuaternion(camera.quaternion)
  camLookatVector = vec3.normalize(camLookatVector, camLookatVector)
  camLookatVector = vec3.scale(camLookatVector, distance)
  camLookatVector = vec3.add(camLookatVector, position, camLookatVector) // position.clone().add(camLookatVector)
  camPosTarget = camLookatVector

  // Simply using vector.equals( otherVector) is not good enough
  if (Math.abs(camPos.x - camPosTarget.x) <= precision &&
    (Math.abs(camPos.y - camPosTarget.y) <= precision) &&
    (Math.abs(camPos.z - camPosTarget.z) <= precision)) {
    // already at target, do nothing
    return {position: camPos, target: camTgt}
  }

  // return data instead of mutating anything, making things more testable too
  // return a set of end /final points , both for the position...and target
  return { position: camPosTarget, target: camTgtTarget }
}

/*return {
starts:[camPos,camTgt]//order matters
,ends:[camTgt, camTgtTarget]
,attrs:["position","target"]
,easing:[TWEEN.Easing.Quadratic.In,TWEEN.Easing.Quadratic.In]
,duration:zoomTime}
  }*/


/*
let tween = new TWEEN.Tween(camPos)
  .to(camPosTarget , zoomTime)
  .easing(TWEEN.Easing.Quadratic.In)
  .onUpdate(function () {
    camera.position.copy(camPos)
  })
  .start()

let tween2 = new TWEEN.Tween(camTgt)
  .to(camTgtTarget , zoomTime)
  .easing(TWEEN.Easing.Quadratic.In)
  .onUpdate(function () {
    camera.target.copy(camTgt)
  })
  .start()
*/
