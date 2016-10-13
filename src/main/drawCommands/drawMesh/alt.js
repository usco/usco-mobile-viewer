import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

// import glslify from 'glslify' // does not work
// var glslify = require('glslify') // works only in browser (browserify transform)
var glslify = require('glslify-sync') // works in client & server


var SHADOW_RES = 1024

export function makeDrawMeshCommand (regl, data) {
  const {scene, entity} = data
  const {buffer, elements, prop} = regl
  const {geometry} = entity

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
  //const vertShader = entity.visuals && entity.visuals.vert ? entity.visuals.vert : glslify(__dirname + '/../shaders/base.vert')
  //const fragShader = entity.visuals && entity.visuals.frag ? entity.visuals.frag : glslify(__dirname + '/../shaders/base.frag')

  const drawMesh = regl({
    frag: `
    precision mediump float;
    varying vec3 vPosition;
    void main () {
      gl_FragColor = vec4(vec3(vPosition.z), 1.0);
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
    }`,

    uniforms: {
      model: prop('mat'),
      color: prop('color')
    },
    attributes: {
      position: buffer(geometry.positions),
      normal: buffer(geometry.normals)
    },
    elements : elements(geometry.cells),
    cull: {
      enable: true
    }
  })

  const drawMesh2 = regl({
    frag: `
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
    }`,

    uniforms: {
      model: prop('mat'),
      color: prop('color')
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

  const drawTri = regl({
    // In a draw call, we can pass the shader source code to regl
    frag: `
    precision mediump float;
    uniform vec4 color;
    void main () {
      gl_FragColor = color;
    }`,

    vert: `
    precision mediump float;
    attribute vec2 position;
    uniform float angle;
    void main () {
      gl_Position = vec4(position, 0, 1);
    }`,

    attributes: {
      position: [
        [-1, 0],
        [0, -1],
        [1, 1]
      ]
    },

    uniforms: {
      color: [1, 0, 0, 1],
      angle: function (context, props, batchId) {
        //console.log('angle', context, props)
        return context.speed * context.tick + 0.01 * batchId
      }
    },

    count: 3
  })

  function command (props) {
    wrapperScope(props, (context) => {
      //drawMesh(props)
      //drawTri(props)
      drawMesh2(props)
    })
  }
  return command
}
