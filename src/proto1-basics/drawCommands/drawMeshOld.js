
////////

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
