var unproject = require('camera-unproject')
var set = require('gl-vec3/set')
var sub = require('gl-vec3/subtract')
var normalize = require('gl-vec3/normalize')

export default function createPickRay (point, viewport, invProjView) {
  let origin = [0, 0, 0]
  let direction = [0, 0, 0]
  set(origin, point[0], point[1], 0)
  set(direction, point[0], point[1], 1)
  unproject(origin, origin, viewport, invProjView)
  unproject(direction, direction, viewport, invProjView)
  sub(direction, direction, origin)
  normalize(direction, direction)

  return {
    origin,
    direction
  }
}
