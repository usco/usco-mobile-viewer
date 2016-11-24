import vec3 from 'gl-vec3'

export default function computeNormalsFromUnindexedPositions (positions) {
  let normals = new Float32Array(positions.length)
  let pointA
  let pointB
  let pointC
  let cb
  let ab

  for (let i = 0, il = positions.length; i < il; i += 9) {
    pointA = vec3.fromValues(positions[i], positions[i + 1], positions[i + 2])
    pointB = vec3.fromValues(positions[i + 3], positions[i + 4], positions[i + 5])
    pointC = vec3.fromValues(positions[i + 6], positions[i + 7], positions[i + 8])

    cb = vec3.subtract([], pointC, pointB)
    ab = vec3.subtract([], pointA, pointB)
    cb = vec3.cross(cb, cb, ab)
    cb = vec3.normalize(cb, cb) // normalize

    normals[i] = cb[0]
    normals[i + 1] = cb[1]
    normals[i + 2] = cb[2]

    normals[i + 3] = cb[0]
    normals[i + 4] = cb[1]
    normals[i + 5] = cb[2]

    normals[i + 6] = cb[0]
    normals[i + 7] = cb[1]
    normals[i + 8] = cb[2]
  }

  return normals
}
