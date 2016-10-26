import vec3 from 'gl-vec3'

/**
 * zooms in on an object trying to fit its bounds on the (2d) screen
 * @param  {Object} camera the camera we are using
 * @param  {Object} bounds the current bounds of the entity
 */
export default function computeCameraToFitBounds (camera, bounds) {
  /*
  bounds: {
    dia: 40,
    center: [0,20,8],
    min: [9, 10, 0],
    max: [15, 10, 4]
  },*/
  if (!bounds) {
    return
  }

  const radius = bounds.dia / 2
  const center = bounds.center
  const targetOffset = vec3.subtract(vec3.create(), center, camera.target)//offset between target bounds center & camera's target

  // move camera to base position
  // compute new camera position
  let camNewPos = vec3.create(camera.position)
  let camNewTgt = vec3.create(camera.target)
  camNewPos = vec3.add(camNewPos, camNewPos, targetOffset)
  camNewTgt = vec3.create(center)

  // and move it away from the boundingSphere of the object
  const dist = vec3.distance(center, camNewPos) - radius * 4

  let vec = vec3.create()
  vec = vec3.subtract(vec, camNewPos, camNewTgt)
  vec = vec3.normalize(vec, vec)
  vec = vec3.scale(vec, vec, dist)

  camNewPos = vec3.subtract(camNewPos, camNewPos, vec)

  return {
    position: camNewPos, //[...camNewPos],
    target: camNewTgt// [...camNewTgt]
  }
}
