import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

// import glslify from 'glslify' // does not work
// var glslify = require('glslify') // works only in browser (browserify transform)
var glslify = require('glslify-sync') // works in client & server

function formatLightsDataForRender (lightsData) {
  const result = lightsData.map(function (data, index) {
    return Object.keys(data).map(function (key) {
      return {name: `'lights[${index}].${key}'`,value: data[key]}
    })
  })
  // console.log('result',result[0])// JSON.stringify(result))
  // console.log(JSON.stringify(lightsData))
  return result
}

  /*formatLightsDataForRender(lights).forEach(function(fields){
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
    })*/


export function drawModelCommand (regl, scene, entity) {
  const {buffer, elements, prop} = regl

  // const {positions, cells, mat, color, pos} = data
  const {geometry} = entity

  const vertShader = entity.visuals && entity.visuals.vert ? entity.visuals.vert : glslify(__dirname + '/shaders/base.vert')
  const fragShader = entity.visuals && entity.visuals.frag ? entity.visuals.frag : glslify(__dirname + '/shaders/base.frag')

  // const normal_old = buffer( geometry.cells && !geometry.normals ? normals(geometry.cells, geometry.positions) : geometry.normals || [])
  let normal // = geometry.cells && !geometry.normals ? normals(geometry.cells, geometry.positions) :
  if (geometry.cells) {
    if (!geometry.normals) {
      normal = buffer(normals(geometry.cells, geometry.positions))
    } else {
      normal = buffer(geometry.normals)
    }
  } else {
    normal = undefined
  }

  let params = {
    vert: vertShader,
    frag: fragShader,

    // more static
    attributes: {
      position: buffer(geometry.positions)
   },

    // more dynamic
    uniforms: {
      model: prop('mat'),
      view: prop('view'),
      projection: (context, props) => {
        return perspective([],
          Math.PI / 4,
          context.viewportWidth / context.viewportHeight,
          0.01,
          1000)
      },

      'lights[0].color': prop('scene.lights[0].color'),
      'lights[0].intensity': prop('scene.lights[0].intensity'),
      'lights[0].position': prop('scene.lights[0].position'),

      'lights[1].color': prop('scene.lights[1].color'),
      'lights[1].intensity': prop('scene.lights[1].intensity'),
      'lights[1].position': prop('scene.lights[1].position'),

      'lights[2].color': prop('scene.lights[2].color'),
      'lights[2].intensity': prop('scene.lights[2].intensity'),
      'lights[2].position': prop('scene.lights[2].position'),

      'lights[3].color': prop('scene.lights[3].color'),
      'lights[3].intensity': prop('scene.lights[3].intensity'),
      'lights[3].position': prop('scene.lights[3].position'),

      // various dynamic uniforms
      color: prop('color'),
      pos: prop('pos'),
      rot: prop('rot'),
      sca: prop('sca')
    },

    primitive: (entity.visuals && entity.visuals.primitive) ? entity.visuals.primitive : 'triangles'
  }
  if (geometry.cells) {
    params.elements = elements(geometry.cells)
  // params.count = geometry.positions.length / 3
  } else {
    params.count = geometry.positions.length / 3
  }

  if (entity.visuals && entity.visuals.lineWidth) {
    if (entity.visuals.lineWidth) {
      params.lineWidth = entity.visuals.lineWidth
    }
    if (entity.visuals.depth) {
      params.depth = entity.visuals.depth
    }
  }

  if (normal !== undefined) {
    params.attributes.normal = normal
  }else{
    params.attributes.normal = regl.buffer([].fill.call({ length: geometry.positions.length }, 0))
  }

  return regl(params)
}

export function drawModel (regl, datas) {
  const data = datas[0]
  // const batchCallData = data.map(function())
  const {scene, entity, camera} = data
  // scene, data, cameraData
  const cmd = drawModelCommand(regl, scene, entity)

  // for entitities
  // all sorts of 'dynamic' data
  const {pos, rot, sca} = entity.transforms
  const {modelMat} = entity

  // simple hack for selection state
  // const {color} = data
  const color = entity.meta.selected ? [1, 0, 0, 1] : entity.visuals.color
  return cmd({ color, mat: modelMat, scene, view: camera.view })
}

/*
* memoize.js
* by @philogb and @addyosmani
* with further optimizations by @mathias
* and @DmitryBaranovsk
* perf tests: http://bit.ly/q3zpG3
* Released under an MIT license.
*/
export function memoize (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments),
      hash = '',
      i = args.length
    let currentArg = null
    while (i--) {
      currentArg = args[i]
      hash += (currentArg === Object(currentArg)) ?
        JSON.stringify(currentArg) : currentArg
      fn.memoize || (fn.memoize = {})
    }
    return (hash in fn.memoize) ? fn.memoize[hash] :
      fn.memoize[hash] = fn.apply(this, args)
  }
}

function hashCode (str) {
  var hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

export function hashEntityForRender (entity) {
  const vertShader = hashCode(entity.visuals && entity.visuals.vert ? entity.visuals.vert : 'base')
  const fragShader = hashCode(entity.visuals && entity.visuals.frag ? entity.visuals.frag : 'base')
  const hash = JSON.stringify({geom: entity.geometry.id, fragShader, vertShader})
  return hash
}

export function makeDrawCalls (regl, data) {
  /*
  Things that need different drawCalls
  Geometry
  visuals:
    entity.visuals.vert
    entity.visuals.frag
  */

  const hashSet = new Set()
  const hashStore = {}

  // this needs to change everytime geometry and OR shaders changes: determines drawCalls, rarely changes /triggered
  const entitiesWithHash = data.entities.map(function (entity) {
    const {scene} = data
    const cmd = drawModelCommand(regl, scene, entity)

    console.log('entity', entity)
    const hash = hashEntityForRender(entity)
    hashSet.add(hash)

    hashStore[hash] = cmd
    return Object.assign({}, entity, {_renderBatchId: hash})
  })

  //console.log('hashSet', hashSet)
  //console.log(hashSet.has(JSON.stringify({geom: data.entities[0].geometry.id, fragShader: 'base',vertShader: 'base'})))
  //console.log(hashSet.has('foo'))
  return {hashStore, entities: entitiesWithHash}
}

export function draw (regl, hashStore, data) {
  // more dynamic this can change every frame
  const dynamicData = data.entities
    .filter(entity => entity.visuals.visible !== undefined ? entity.visuals.visible : true)
    .map(function (entity, index) {
    const {pos, rot, sca} = entity.transforms
    const {modelMat} = entity
    const {scene, camera} = data

    // simple hack for selection state
    // const {color} = data
    const color = entity.meta.selected ? [1, 0, 0, 1] : entity.visuals.color

    // create transform matrix
    /*let modelMat = mat4.identity([])
    mat4.translate(modelMat, modelMat, [pos[0], pos[2], pos[1]]) // z up
    mat4.rotateX(modelMat, modelMat, rot[0])
    mat4.rotateY(modelMat, modelMat, rot[2])
    mat4.rotateZ(modelMat, modelMat, rot[1])
    mat4.scale(modelMat, modelMat, [sca[0], sca[2], sca[1]])
    /*let modelMat = mat4.identity([])
    mat4.translate(modelMat, modelMat, pos)
    mat4.rotateX(modelMat, modelMat, rot[0])
    mat4.rotateY(modelMat, modelMat, rot[1])
    mat4.rotateZ(modelMat, modelMat, rot[2])
    mat4.scale(modelMat, modelMat, [sca[0], sca[1], sca[2]])*/

    //return { color, mat: modelMat, scene, view: camera.view }
    //return drawCalls[index]({ color, mat: modelMat, scene, view: camera.view })
    const drawCall = hashStore[entity._renderBatchId]
    return drawCall({ color, mat: modelMat, scene, view: camera.view})
  })

  return dynamicData
}
