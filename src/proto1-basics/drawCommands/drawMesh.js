import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

// import glslify from 'glslify' // does not work
// var glslify = require('glslify') // works only in browser (browserify transform)
var glslify = require('glslify-sync') // works in client & server

function fetchNormals(buffer, geometry){
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

  // const normal_old = buffer( geometry.cells && !geometry.normals ? normals(geometry.cells, geometry.positions) : geometry.normals || [])
  return normal
}

export function makeDrawMeshCommand (regl, scene, entity) {
  const {buffer, elements, prop} = regl
  // const {positions, cells, mat, color, pos} = data
  const {geometry} = entity

  const vertShader = entity.visuals && entity.visuals.vert ? entity.visuals.vert : glslify(__dirname + '/../shaders/base.vert')
  const fragShader = entity.visuals && entity.visuals.frag ? entity.visuals.frag : glslify(__dirname + '/../shaders/base.frag')

  let normal = fetchNormals(buffer, geometry)

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

  console.log('using this one')
  return regl(params)
}
