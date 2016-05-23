//const regl = require('regl')()
import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

// import glslify from 'glslify' // does not work
var glslify = require('glslify')
var mouse = require('mouse-change')(function () {})

function formatLightsDataForRender(lightsData){
  const result = lightsData.map(function (data, index) {
    return Object.keys(data).map(function(key){
      return {name: `'lights[${index}].${key}'`,value: data[key]}
    })
  })
  //console.log('result',result[0])// JSON.stringify(result))
  //console.log(JSON.stringify(lightsData))
  return result
}

export function drawModelCommand (regl, sceneData, data) {
  const {buffer, elements, prop} = regl

  // const {positions, cells, mat, color, pos} = data
  const {geometry, transforms} = data
  let params = {
    vert: glslify(__dirname + '/shaders/base.vert'),
    frag: glslify(__dirname + '/shaders/base.frag'),

    attributes: {
      position: buffer(geometry.positions),
      normal: buffer(normals(geometry.cells, geometry.positions))
    },
    uniforms: {
      model: prop('mat'),
      view: (props, context) => {
        const t = 0.01 * context.count * sceneData.controls[0].rotateSpeed
        return lookAt([],
          [30 * Math.cos(t), 2.5, 30 * Math.sin(t)],
          [0, 2.5, 0],
          [0, 1, 0])
      },
      projection: (props, context) => {
        return perspective([],
          Math.PI / 4,
          context.viewportWidth / context.viewportHeight,
          0.01,
          1000)
      },

      mouse: (props, {pixelRatio, height}) => [
        mouse.x * pixelRatio,
        height - mouse.y * pixelRatio
      ],
      // lighting
      /*lights: [
        {color: [1, 0, 0], intensity: 0.2, position: [10, 10, 10]},
        {color: [0, 1, 0], intensity: 1, position: [-10, 10, 10]},
        {color: [0, 0, 1], intensity: 1, position: [10, 20, 10]},
        {color: [1, 1, 0], intensity: 1, position: [10, 10, 0]}
      ],*/
      //'lights[0].color': [1, 0, 0],
      //'lights[0].intensity': 0.2,
      'lights[0].position': [10, 10, 10],

      'lights[1].color': [0, 1, 0],
      'lights[1].intensity': 1,
      'lights[1].position': [-10, 10, 10],

      'lights[2].color': [0, 0, 1],
      'lights[2].intensity': 1,
      'lights[2].position': [10, 20, 10],

      'lights[3].color': [1, 1, 0],
      'lights[3].intensity': 1,
      'lights[3].position': [10, 10, 0],

      //various dynamic uniforms
      color: prop('color'),
      pos: prop('pos'),
      rot: prop('rot'),
      sca: prop('sca')
    }

  }
  if (geometry.cells) {
    params.elements = elements(geometry.cells)
  // console.log(geometry.cells.length*3)
  } else {
    params.count = geometry.positions.length / 3
  }
  //lighting data
  const lights = [
    {color: [1, 0, 0], intensity: 0.2, position: [10, 10, 10]},
    {color: [0, 1, 0], intensity: 1, position: [-10, 10, 10]},
    {color: [0, 0, 1], intensity: 1, position: [10, 20, 10]},
    {color: [1, 1, 0], intensity: 1, position: [10, 10, 0]}
  ]


  formatLightsDataForRender(lights).forEach(function(fields){
    fields.forEach(function(entry){
      params.uniforms[entry.name] = entry.value
    })
  })

  let formatedLights = formatLightsDataForRender(lights)
  params.uniforms['lights[0].color']=formatedLights[0][0].value
  params.uniforms['lights[0].intensity']=formatedLights[0][1].value

  const par1 = [params]
    .map(function(params){
      formatLightsDataForRender(lights).forEach(function(fields){
        fields.forEach(function(entry){
          return params.uniforms[entry.name] = entry.value
        })
      })
      return params
    })

  return regl(params)
}

export default function drawModel(regl, sceneData, data){
  const cmd = drawModelCommand(regl, sceneData, data)

  //all sorts of 'dynamic' data
  const {pos, rot, sca} = data.transforms
  // const {color} = data
  const color = data.selected ? [1, 0, 0, 1] : data.color

  // create transform matrix
  let modelMat = mat4.identity([])
  mat4.translate(modelMat, modelMat, [pos[0], pos[2], pos[1]]) // z up
  mat4.rotateX(modelMat, modelMat, rot[0])
  mat4.rotateY(modelMat, modelMat, rot[2])
  mat4.rotateZ(modelMat, modelMat, rot[1])
  mat4.scale(modelMat, modelMat, [sca[0], sca[2], sca[1]])

  return cmd({color, mat: modelMat})
}
