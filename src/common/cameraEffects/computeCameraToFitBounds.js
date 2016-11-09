import vec3 from 'gl-vec3'
import mat4 from 'gl-mat4'

/**
 * zooms in on an object trying to fit its bounds on the (2d) screen
 * assumes the bounds CENTER is not in world space for now, hence transforms needing to be passed
 * @param  {Object} camera the camera we are using
 * @param  {Object} bounds the current bounds of the entity
 */
export default function computeCameraToFitBounds ({camera, bounds, transforms}) {
  /*
  bounds: {
    dia: 40,
    center: [0,20,8],
    min: [9, 10, 0],
    max: [15, 10, 4]
  },*/
  if (!bounds || !camera) {
    throw new Error('No camera/bounds specified!')
  }

  const {projection, view} = camera
  // const radius = bounds.dia / 2
  // we use radius so that we can be perspective indenpdant : a sphere seen from any angle is a sphere...
  const radius = Math.max(...bounds.size) * 0.5 // we find the biggest dimension
  const center = vec3.add([], bounds.center, transforms.pos) // TODO: apply transforms to center , here or elswhere ??

  const targetOffset = vec3.subtract([], center, camera.target) // offset between target bounds center & camera's target

  // move camera to base position
  // compute new camera position
  let camNewPos = vec3.fromValues(...camera.position)
  let camNewTgt = vec3.fromValues(...camera.target)
  camNewPos = vec3.add(camNewPos, camNewPos, targetOffset)
  camNewTgt = vec3.fromValues(...center)

  // and move it away from the boundingSphere of the object
  const combinedProjView = mat4.multiply([], projection, view)
  const dist = vec3.distance(center, camNewPos) - radius * 4 // FIXME: this needs to use the projection info/perspective

  let vec = vec3.create()
  vec = vec3.subtract(vec, camNewPos, camNewTgt)
  vec = vec3.normalize(vec, vec)
  vec = vec3.scale(vec, vec, dist)

  camNewPos = vec3.subtract(camNewPos, camNewPos, vec)

  return {
    position: [...camNewPos],
    target: [...camNewTgt]
  }
}
