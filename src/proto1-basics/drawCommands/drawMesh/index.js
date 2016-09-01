import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

// import glslify from 'glslify' // does not work
// var glslify = require('glslify') // works only in browser (browserify transform)
var glslify = require('glslify-sync') // works in client & server

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
      }
    }
  })

  const drawMesh = regl({
    /*frag: `
    precision mediump float;
    varying vec3 vPosition;
    uniform vec3 lightColor;
    void main () {
      gl_FragColor = vec4(lightColor.x, lightColor.y, 0., 1.0);
    }`,
    vert: `
    precision mediump float;
    attribute vec3 position;
    uniform mat4 lightProjection, lightView, model, projection, view;
    varying vec3 vPosition;
    void main() {
      vec4 p = projection * view * model * vec4(position, 1.0);
      gl_Position = p;
      vPosition = p.xyz;
    }`,*/

    vert: entity.visuals && entity.visuals.vert ? entity.visuals.vert : glslify(__dirname + '/shaders/base.vert'),
    frag: entity.visuals && entity.visuals.frag ? entity.visuals.frag : glslify(__dirname + '/shaders/base.frag'),

    uniforms: {
      model: prop('mat'),
      color: prop('color'),
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
    },
    attributes: {
      position: buffer(geometry.positions),
      normal: buffer(geometry.normals)
    },
    elements : elements(geometry.cells),
    cull: {
      enable: true
    },
    //framebuffer: fbo
  })

  function command (props) {
    wrapperScope(props, (context) => {
      //console.log('props', props)
      //throw new Error("mlk")
      drawMesh(props)
    })
  }
  return command
}
