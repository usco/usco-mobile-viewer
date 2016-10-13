var glslify = require('glslify-sync') // works in client & server

export default function makeGrid (params) {
  let {size, ticks} = params
  ticks = ticks || 10

  const width = size[0]
  const length = size[1]

  let positions = []
  console.log('making grid')

  for (let i = -width;i <= width;i += ticks) {
    positions.push(-length, i, 0)
    positions.push(length, i, 0)
    positions.push(-length, i, 0)
  }

  for (let i = -length;i <= length;i += ticks) {
    positions.push(i, -width, 0)
    positions.push(i, width, 0)
    positions.push(i, -width, 0)
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
      pos: [0, 0, 0.1],
      rot: [0, 0, 0],
      sca: [1, 1, 1]
    },

    meta: {
      pickable: false
    }

  }

  return gridData
}
