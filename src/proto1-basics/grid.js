var glslify = require('glslify-sync') // works in client & server

export default function makeGrid (size, ticks = 10) {
  let positions = []
  console.log('making grid')

  for (let i = -size;i < size;i += ticks) {
    positions.push(-size, 0, i)
    positions.push(size, 0, i)
    positions.push(-size, 0, i)
  }

  for (let i = -size;i < size;i += ticks) {
    positions.push(i, 0, -size)
    positions.push(i, 0, size)
    positions.push(i, 0, -size)
  }

  const gridData = {
    visuals: {
      frag: glslify(__dirname + '/shaders/foggy.frag'),

      color: [0, 0, 0, 0.8], // 0.7, 0.8, 0.9],
      primitive: 'line strip'
    },

    geometry: {
      positions,
      id: '-1'
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

  return gridData
}
