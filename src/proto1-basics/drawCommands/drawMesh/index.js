import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
// import glslify from 'glslify' // does not work
// var glslify = require('glslify') // works only in browser (browserify transform)
var glslify = require('glslify-sync') // works in client & server

import drawBase from './drawBase'
import drawDepth from './drawDepth'
import drawColor from './drawColor'

export function makeDrawMeshCommand (regl, data) {
  const {entity} = data
  const {buffer, elements, prop} = regl
  const {geometry} = entity
  const SHADOW_RES = 1024

  //console.log('normals', geometry)
  //const norm

  const fbo = regl.framebuffer({
    color: regl.texture({
      width: SHADOW_RES,
      height: SHADOW_RES,
      wrap: 'clamp',
      type: 'float'
    }),
    depth: true
  })

  const wrapperScope = regl({
    context: {
      lightDir: [0.39, 0.87, 0.29],
    },
    uniforms: {
      lightDir: regl.context('lightDir'),
      lightColor: [1, 0.8, 0],
      lightView: (context) => {
        return mat4.lookAt([], context.lightDir, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0])
      },
      lightProjection: mat4.ortho([], -25, 25, -20, 20, -25, 25),

      view: (context, props) => props.view,
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
      'lights[3].position': prop('scene.lights[3].position')
    }
  })

  const _drawBase = drawBase(regl, {geometry})
  const _drawColor = drawColor(regl, {entity})
  const _drawDepth = drawDepth(regl, {fbo})

  function command (props) {
    var drawMeshes = () => _drawBase(props)

    wrapperScope(props, (context) => {
      _drawDepth(drawMeshes)
      _drawColor(drawMeshes)
    })
  }

  return command
}
