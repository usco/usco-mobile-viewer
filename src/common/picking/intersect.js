import mat4 from 'gl-mat4'
import vec3 from 'gl-vec3'

import intersectAABB from 'ray-aabb-intersection'
import intersectTRI from 'ray-triangle-intersection'

export default function intersect (ray, entity, index) {
  // first check aabb // sphere
  // then go into more precise stuff
  const {modelMat} = entity
  // convert min & max to world coordinates
  let min = vec3.transformMat4(mat4.identity([]), entity.bounds.min, modelMat) // out:vec3, a:vec3, m:mat4
  let max = vec3.transformMat4(mat4.identity([]), entity.bounds.max, modelMat) // out:vec3, a:vec3, m:mat4

  const bounds = [min, max] // [entity.bounds.min, entity.bounds.max] // FIXME !!!! bounds are in local coordinates, not world coordinates !

  const hitAABB = intersectAABB([], ray.ro, ray.rd, bounds)
  if (hitAABB) {
    console.log('boundingBox hit', hitAABB)
    // TODO: convert ray (world) coordinates to local coordinates

    const {transformMat4} = vec3
    const invModelMat = mat4.invert(mat4.identity([]), modelMat)
    const localRayRo = transformMat4(vec3.create(), ray.ro, invModelMat)
    const localRayRd = transformMat4(vec3.create(), ray.rd, invModelMat)

    //if we do not want to go any deeper into the object
    if(entity.meta.pickLimit && entity.meta.pickLimit === 'bounds')
    {
      const hitPoint = hitAABB
      console.log('that is a match !! , for ' + entity.id)
      // distance between intersect point and ray origin, in world space
      const distance = vec3.length(vec3.subtract(vec3.create(), hitPoint, ray.ro))

      setSelection(entity)
      return {intersect: {pos: hitPoint, distance}, entity, index}
    }

    if (!entity.geometry.cells) {
      return null
    }
    const hitTRI = entity.geometry.cells.map(function (cell, index) {
      const positions = entity.geometry.positions

      // FIXME : UGH local => world conversion works, but this is terribly ineficient
      function conv (pos) {
        return vec3.transformMat4(mat4.identity([]), pos, modelMat)
      }
      //FIXME: we can only do it like this if the original data is nested arrays !
      const tri = [ conv(positions[cell[0]]), conv(positions[cell[1]]), conv(positions[cell[2]])]

      const hitTRI = intersectTRI([], ray.ro, ray.rd, tri)
      if (hitTRI) {
        console.log('tri', hitTRI)
        return hitTRI
      }
      return null
    })
      .filter(h => h !== null)
      .reduce(function (acc, cur) {
        acc.push(cur)
        return acc
      }, [])

    if (hitTRI.length > 0) {
      const hitPoint = hitTRI[0]
      console.log('that is a match !! , for ' + entity.id)
      // distance between intersect point and ray origin, in world space
      const distance = vec3.length(vec3.subtract(vec3.create(), hitPoint, ray.ro))
      //entity.visuals.visible = !entity.visuals.visible
      return {intersect: {pos: hitPoint, distance}, entity, index}
    }
    return null
  }
  return null
}
