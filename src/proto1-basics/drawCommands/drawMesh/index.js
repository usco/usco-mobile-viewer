import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
// import glslify from 'glslify' // does not work
// var glslify = require('glslify') // works only in browser (browserify transform)
var glslify = require('glslify-sync') // works in client & server

import drawBase from './drawBase'
import drawDepth from './drawDepth'
import drawColor from './drawColor'

import drawNormal from './drawNorm'

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

  let foo = 0
  const wrapperScope = regl({
    context: {
      lightDir: [.39, 0.87, 0.29],
    },
    uniforms: {
      lightDir: (context, props)=>{
        //foo +=0.02
        let res = [props.counter+.39, 0.87, 0.29]
        //console.log('context', res)
        //(context, props)=>Math.cos(props.counter/100)*0.2+0.1
        return [0,Math.sin(props.counter/100),Math.cos(props.counter/100)]
        //return regl.context('lightDir')
      },
      lightColor: [1, 0.8, 0],
      lightView: (context) => {
        return mat4.lookAt([], context.lightDir, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0])
      },
      lightProjection: mat4.ortho([], -25, 25, -20, 20, -25, 25),
      ambientLightAmount: 0.8,
      diffuseLightAmount: 0.8,

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

  const _drawNorm = drawNormal(regl, {fbo, SHADOW_RES})

  function command (props) {
    var drawMeshes = () => _drawBase(props)

    wrapperScope(props, (context) => {
      //console.log(context)
      _drawDepth(drawMeshes)
      _drawNorm(drawMeshes)
      //_drawColor(drawMeshes)
    })
  }

  return command
}
