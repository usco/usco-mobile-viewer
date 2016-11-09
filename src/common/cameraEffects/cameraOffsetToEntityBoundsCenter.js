import vec3 from 'gl-vec3'

/**
 * offsets camera & camera target to align to objects's 'center of gravity' (center of bounds)
 * on the Z axis only !!
 * @param  {Object} camera the camera we are using
 * @param  {Object} bounds the current bounds of the entity
 */
export default function cameraOffsetToEntityBoundsCenter ({camera, bounds, transforms, axis}) {
  if (!bounds || !camera) {
    throw new Error('No camera/bounds specified!')
  }
  let {target, position} = camera

  const boundsCenter = bounds.max.map(function (pos, idx) {
    return pos - bounds.min[idx]
  })
  //FIXME : do we need to offset things by transforms here or not ?
  const focusPoint = vec3.add([], vec3.fromValues(...transforms.pos), vec3.fromValues(...boundsCenter))

  const diff = vec3.subtract([], focusPoint, target)
  const zOffset = [0, 0, diff[axis] * 0.5]
  target = vec3.add([], target, zOffset)
  position = vec3.add([], position, zOffset)

  return {
    position,
    target
  }
}
