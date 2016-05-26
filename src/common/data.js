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

const bunnyData3 = {
  geometry: bunny,
  transforms: {
    pos: [10, -12.989, 3],
    rot: [0, 0, 0],
    sca: [1, 1, 1]
  },
  color: [0, 1, 0, 0.5],
  selected: false
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
      rotateSpeed: 0.2,
      panSpeed: 2.0,
      zoomSpeed: 2.0,
      autoRotate: {
        enabled: false,
        speed: 0.2
      },
      _enabled: true,
      _active: true
    }
  ],
  // lighting data
  lights: [
    {position: [10, 10, 10], color: [1.0, 0.7, 0.7], intensity: 0.5},
    {position: [-10, 10, 10], color: [0.3, 0.7, 1.0], intensity: 1},
    {position: [10, 20, 10], color: [0.9, 0.9, 0.9], intensity: 0.8},
    {position: [10, 10, 0], color: [0.6, 0.7, 0.8], intensity: 0.5}
  ]
}

export {bunnyData, bunnyData2, bunnyData3, sceneData}
