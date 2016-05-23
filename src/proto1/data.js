import mat4 from 'gl-mat4'
import bunny from 'bunny'

// /per model data
let triMat = mat4.identity([]) // create([])
mat4.translate(triMat, triMat, [1, 10, 20])

const triData = {
  geometry: {
    positions: /* [
      2, 2, 0,
      1, 2, -2,
      0, 1, -2
    ],*/
    new Float32Array([// works too!
      2, 2, 0,
      1, 2, -2,
      0, 1, -2
    ])
  },
  transforms: {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    sca: [1, 1, 1]
  },
  color: [1, 0, 0, 0.5]
}

const bunnyData = {
  geometry: bunny,
  transforms: {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    sca: [1, 1, 1]
  },
  color: [0, 1, 0, 0.5],
  selected: true
}

const bunnyData2 = {
  geometry: bunny,
  transforms: {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    sca: [1, 1, -1]
  },
  color: [0, 1, 1, 0.5],
  selected: false
}

const sceneData = {
  cameras: [
    {
      pos: [75, 75, 145], // [100,-100,100]
      up: [0, 0, 1],
      lens: {
        fov: 45,
        near: 0.1,
        far: 20000
      }
    }
  ],
  controls: [
    {
      up: [0, 0, 1],
      rotateSpeed: 2.0,
      panSpeed: 2.0,
      zoomSpeed: 2.0,
      autoRotate: {
        enabled: false,
        speed: 0.2
      },
      _enabled: true,
      _active: true
    }
  ]
}

export {bunnyData, bunnyData2, sceneData}
