import mat4 from 'gl-mat4'

/*compute  object transformation matrix from transforms: costly : only do it when changes happened*/
export default function computeTMatrixFromTransforms (params) {
  const defaults = {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    sca: [1, 1, 1]
  }
  const {pos, rot, sca} = Object.assign({}, defaults, params)
  // create transform matrix
  let transforms = mat4.identity([])
  mat4.translate(transforms, transforms, pos) // [pos[0], pos[2], pos[1]]// z up
  mat4.rotateX(transforms, transforms, rot[0])
  mat4.rotateY(transforms, transforms, rot[1])
  mat4.rotateZ(transforms, transforms, rot[2])
  mat4.scale(transforms, transforms, sca) // [sca[0], sca[2], sca[1]])

  return transforms
}
