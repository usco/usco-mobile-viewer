import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

// import glslify from 'glslify' // does not work
// var glslify = require('glslify') // works only in browser (browserify transform)
var glslify = require('glslify-sync') // works in client & server


var SHADOW_RES = 1024

export function makeDrawMeshCommand (regl, scene, entity){
  const {buffer, elements, prop, props} = regl
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
      view: (context, props) => {
        console.log('context, props', context, props)
        return props.view//prop('view')
      }, //prop('view'),*/
      //view: prop('view'),
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
      color: prop('color'),
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

  function command(props){
    wrapperScope(props, (context) => {
      //drawMesh(props)
      //drawTri(props)
      drawMesh2(props)
    })
  }
  return command //(context, props)=> scope(context, propss)
}



////////

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

export function _makeDrawMeshCommand (regl, scene, entity) {
  const {buffer, elements, prop} = regl
  // const {positions, cells, mat, color, pos} = data
  const {geometry} = entity

  const vertShader = entity.visuals && entity.visuals.vert ? entity.visuals.vert : glslify(__dirname + '/../shaders/base.vert')
  const fragShader = entity.visuals && entity.visuals.frag ? entity.visuals.frag : glslify(__dirname + '/../shaders/base.frag')

  const normal = fetchNormals(buffer, geometry)


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
      lightDir: [0.39, 0.87, 0.29]
    },
    uniforms: {
      lightDir: regl.context('lightDir'),
      lightView: (context) => {
        return mat4.lookAt([], context.lightDir, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0])
      },
      lightProjection: mat4.ortho([], -25, 25, -20, 20, -25, 25)
    }
  })

  const drawDepth = regl({
    frag: `
    precision mediump float;
    varying vec3 vPosition;
    void main () {
      gl_FragColor = vec4(vec3(vPosition.z), 1.0);
    }`,
    vert: `
    precision mediump float;
    attribute vec3 position;
    uniform mat4 lightProjection, lightView, model;
    varying vec3 vPosition;
    void main() {
      vec4 p = lightProjection * lightView * model * vec4(position, 1.0);
      gl_Position = p;
      vPosition = p.xyz;
    }`,
    framebuffer: fbo
  })

  const drawNormal = regl({
  uniforms: {
    view: prop('view'),
    projection: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
                       Math.PI / 4,
                       viewportWidth / viewportHeight,
                       0.01,
                       2000),
    shadowMap: fbo,
    minBias: () => 0.005,
    maxBias: () => 0.03
  },
  frag: `
  precision mediump float;
  varying vec3 vNormal;
  varying vec3 vShadowCoord;
  uniform float ambientLightAmount;
  uniform float diffuseLightAmount;
  uniform vec3 color;
  uniform sampler2D shadowMap;
  uniform vec3 lightDir;
  uniform float minBias;
  uniform float maxBias;
#define texelSize 1.0 / float(${SHADOW_RES})
  float shadowSample(vec2 co, float z, float bias) {
    float a = texture2D(shadowMap, co).z;
    float b = vShadowCoord.z;
    return step(b-bias, a);
  }
  void main () {
    vec3 ambient = ambientLightAmount * color;
    float cosTheta = dot(vNormal, lightDir);
    vec3 diffuse = diffuseLightAmount * color * clamp(cosTheta , 0.0, 1.0 );
    float v = 1.0; // shadow value
    vec2 co = vShadowCoord.xy * 0.5 + 0.5;// go from range [-1,+1] to range [0,+1]
    // counteract shadow acne.
    float bias = max(maxBias * (1.0 - cosTheta), minBias);
    float v0 = shadowSample(co + texelSize * vec2(0.0, 0.0), vShadowCoord.z, bias);
    float v1 = shadowSample(co + texelSize * vec2(1.0, 0.0), vShadowCoord.z, bias);
    float v2 = shadowSample(co + texelSize * vec2(0.0, 1.0), vShadowCoord.z, bias);
    float v3 = shadowSample(co + texelSize * vec2(1.0, 1.0), vShadowCoord.z, bias);
    // PCF filtering
    v = (v0 + v1 + v2 + v3) * (1.0 / 4.0);
    // if outside light frustum, render now shadow.
    // If WebGL had GL_CLAMP_TO_BORDER we would not have to do this,
    // but that is unfortunately not the case...
    if(co.x < 0.0 || co.x > 1.0 || co.y < 0.0 || co.y > 1.0) {
      v = 1.0;
    }
    gl_FragColor = vec4((ambient + diffuse * v), 1.0);
  }`,
  vert: `
  precision mediump float;
  attribute vec3 position;
  attribute vec3 normal;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vShadowCoord;
  uniform mat4 projection, view, model;
  uniform mat4 lightProjection, lightView;
  void main() {
    vPosition = position;
    vNormal = normal;
    vec4 worldSpacePosition = model * vec4(position, 1);
    gl_Position = projection * view * worldSpacePosition;
    vShadowCoord = (lightProjection * lightView * worldSpacePosition).xyz;
  }`
})

const drawMesh = regl({
  uniforms: {
    model: prop('mat'),
    ambientLightAmount: 0.3,
    diffuseLightAmount: 0.7,
    color: prop('color')
  },
  attributes: {
    position: regl.this('position'),
    normal: regl.this('normal')
  },
  elements: regl.this('elements'),
  cull: {
    enable: true
  }
})


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
    if (entity.visuals.depth) {
      params.depth = entity.visuals.depth
    }
  }

  if (normal !== undefined) {
    params.attributes.normal = normal
  }else{
    params.attributes.normal = regl.buffer([].fill.call({ length: geometry.positions.length }, 0))
  }

  console.log('using drawMesh')
  return regl(params)
  //return drawDepth(params)
}
