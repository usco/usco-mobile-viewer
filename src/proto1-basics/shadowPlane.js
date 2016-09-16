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

  //custom draw function?
  function drawFn(regl, params) {
    const {geometry} = params
    const {prop, buffer, elements} = regl
    return regl({
      uniforms: {
        model: prop('mat'),
        color: prop('color')
      },
      attributes: {
        position: buffer(geometry.positions),
        normal: buffer(geometry.normals)
      },
      elements : elements(geometry.cells),
      depth: {
        enable: false,
        mask: true,
        func: 'less',
        range: [0, 1]
      },
    })
  }

  const data = {
    visuals: {
      color: [1, 1, 1, 0.8],
      type: 'mesh',
      //drawFn,
      params:{
        depth: {
          enable: true,
          mask: false,
          func: 'less',
          range: [0, 1]
        },
        cull: {
          enable: true,
          face: 'back'
        },
        blend: {
          enable: false,
          func: {
            srcRGB: 'src alpha',
            srcAlpha: 1,
            dstRGB: 'one minus src alpha',
            dstAlpha: 'src alpha'
          },
          equation: {
            rgb: 'add',
            alpha: 'add'
          },
          color: [0, 0, 0, 0]
        },
        stencil: {
          enable: true,
          mask: 0x0,
          func: {
            cmp: '=',
            ref: 0,
            mask: 0x00
          },
          opFront: {
            fail: 'zero',
            zfail: 'zero',
            zpass: 'zero'
          },
          opBack: {
            fail: 'invert',
            zfail: 'zero',
            zpass: 'zero'
          }
        },
      }
    },

    geometry: {
      positions,
      normals,
      cells: elements,
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
