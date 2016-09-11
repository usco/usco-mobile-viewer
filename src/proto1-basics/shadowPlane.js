var glslify = require('glslify-sync') // works in client & server

export default function makeShadowPlane (size) {

  const elements = [[3, 1, 0], [0, 2, 3]]
  let positions = []
  let normals = []

  const negHalfSize = -size / 2
  const posHalfSize = size / 2

  positions.push([negHalfSize, 0.0, negHalfSize])
  positions.push([posHalfSize, 0.0, negHalfSize])
  positions.push([negHalfSize, 0.0, posHalfSize])
  positions.push([posHalfSize, 0.0, posHalfSize])

  normals.push([0.0, 1.0, 0.0])
  normals.push([0.0, 1.0, 0.0])
  normals.push([0.0, 1.0, 0.0])
  normals.push([0.0, 1.0, 0.0])

  const data = {
    visuals: {
      //frag: glslify(__dirname + '/shaders/foggy.frag'),
      color: [0, 0, 0, 0.8],
      type: 'mesh'
    },

    geometry: {
      positions,
      normals,
      elements,
      id: '-10'
    },

    transforms: {
      pos: [0, 0, 0],
      rot: [0, 0, 0],
      sca: [1, 1, 1]
    },

    meta: {
      pickable: false
    }

  }

  return data
}
