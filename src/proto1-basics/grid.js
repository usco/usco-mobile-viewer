var glslify = require('glslify-sync') // works in client & server

export default function makeGrid (params) {
  let {size, ticks} = params
  ticks = ticks || 10

  const width = size
  const length = size/2

  let positions = []
  console.log('making grid')

  for (let i = -width;i <= width;i += ticks) {
    positions.push(-length, 0, i)
    positions.push(length, 0, i)
    positions.push(-length, 0, i)
  }

  for (let i = -length;i <= length;i += ticks) {
    positions.push(i, 0, -width)
    positions.push(i, 0, width)
    positions.push(i, 0, -width)
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
