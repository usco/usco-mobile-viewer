var glslify = require('glslify-sync') // works in client & server
import mat4 from 'gl-mat4'

export default function prepareDrawGrid (regl, params = {}) {
  let positions = []
  const infinite = params.infinite || false
  const centered = params.centered || false

  let {size, ticks} = params
  ticks = ticks || 1
  size = size || [16, 16]

  const width = size[0]
  const length = size[1]

  if (centered) {
    const halfWidth = width * 0.5
    const halfLength = length * 0.5

    const remWidth = halfWidth % ticks
    const widthStart = -halfWidth + remWidth
    const widthEnd = -widthStart

    const remLength = halfLength % ticks
    let lengthStart = -halfLength + remLength
    const lengthEnd = -lengthStart

    const skipEvery = 0

    for (let i = widthStart, j=0; i <= widthEnd; i += ticks, j+=1) {
      if(j%skipEvery !==0){
        positions.push(lengthStart, i, 0)
        positions.push(lengthEnd, i, 0)
        positions.push(lengthStart, i, 0)
      }
    }
    for (let i = lengthStart, j=0; i <= lengthEnd; i += ticks, j+=1) {
      if(j%skipEvery !==0){
        positions.push(i, widthStart, 0)
        positions.push(i, widthEnd, 0)
        positions.push(i, widthStart, 0)
      }
    }

  } else {
    for (let i = -width * 0.5; i <= width * 0.5; i += ticks) {
      positions.push(-length * 0.5, i, 0)
      positions.push(length * 0.5, i, 0)
      positions.push(-length * 0.5, i, 0)
    }

    for (let i = -length * 0.5; i <= length * 0.5; i += ticks) {
      positions.push(i, -width * 0.5, 0)
      positions.push(i, width * 0.5, 0)
      positions.push(i, -width * 0.5, 0)
    }
  }

  const frag = infinite ? glslify(__dirname + '/shaders/foggy.frag') : glslify(__dirname + '/shaders/grid.frag')

  return regl({
    vert: glslify(__dirname + '/../shaders/basic.vert'),
    frag,

    attributes: {
      position: regl.buffer(positions)
    },
    count: positions.length / 3,
    uniforms: {
      model: (context, props) => props.model || mat4.identity([]),
      view: (context, props) => props.view,
      _projection: (context, props) => {
        return mat4.ortho([], -300, 300, 350, -350, 0.01, 1000)
      },
      color: regl.prop('color'),
      fogColor: (context, props) => props.fogColor || [1, 1, 1, 1]
    },
    lineWidth: 2,
    primitive: 'lines',
    cull: {
      enable: true,
      face: 'front'
    },
    polygonOffset: {
      enable: true,
      offset: {
        factor: 1,
        units: Math.random() * 10
      }
    }

  })
}
