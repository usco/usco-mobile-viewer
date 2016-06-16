var glslify = require('glslify-sync') // works in client & server

export function makeCube () {
  const size = 2
  const positions = [
    -1, -1, -1,
    1, -1, -1,
    1, -1, 1,
    -1, -1, 1,

    -1, 1, -1,
    1, 1, -1,
    1, 1, 1,
    -1, 1, 1,
  ].map(p => p * size * 0.5)

  /*const cells = [
    0, 1, 2, // bottom
    0, 2, 3,

    0, 1, 4, // sides
    1, 4, 5,

    1, 2, 5,
    2, 5, 6,

    2, 3, 6,
    3, 6, 7,

    3, 4, 7,
    4, 7, 0,

    4, 5, 6, // top
    4, 6, 7,
  ]*/

  // use this one for clean cube wireframe outline
  const cells = [
    0, 1, 2, 3, 0,
    4, 5, 6, 7, 4,
    5, 1, 2, 6, 7, 3
  ]

  const normals = positions.map(p => p / size)

  console.log('making transforms gizmo')

  const data = {
    visuals: {
      // frag: glslify(__dirname + '/shaders/foggy.frag'),

      color: [0, 0, 0, 0.8], // 0.7, 0.8, 0.9],
      primitive: 'line strip',
      lineWidth: 4,

      depth: {
        enable: false,
        mask: false,
        func: 'less',
        range: [0, 1]
      }
    },

    geometry: {
      positions,
      cells,
      normals,
      id:'0949039'
    },

    transforms: {
      pos: [0, 0, 0],
      rot: [0, 0, 0],
      sca: [1, 1, 1]
    },

    meta: {
      pickable: true,
      pickLimit: 'bounds',
      fastPick: true,
      selected: false,
      //problem ; local vs external picking loop
      name: 'pickCube',
      id: 'pC'
    }
  }

  return data
}



export default function makeTransformGizmo () {
  let xCube = makeCube()
  let yCube = makeCube()
  let zCube = makeCube()

  xCube.transforms.pos = [-20,0,0]
  xCube.meta.name = 'pickCubeX'
  yCube.meta.name = 'pickCubeY'
  zCube.meta.name = 'pickCubeZ'


  return [xCube, yCube, zCube]
}
