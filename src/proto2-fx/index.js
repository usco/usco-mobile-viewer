const regl = require('regl')()
const mat4 = require('gl-mat4')
const bunny = require('bunny')


const stencil = regl.texture({format:'depth'})
const depth   = regl.texture({format:'depth'})

const drawBunny = regl({
  vert: `
  precision mediump float;
  attribute vec3 position;
  uniform mat4 model, view, projection;
  void main() {
    gl_Position = projection * view * model * vec4(position, 1);
  }`,

  frag: `
  precision mediump float;
  uniform vec4 color;
  void main() {
    gl_FragColor = color;
  }`,

  attributes: {
    position: regl.buffer(bunny.positions)
  },

  elements: regl.elements(bunny.cells),

  uniforms: {
    model: mat4.identity([]),
    view: (props, context) => {
      var t = 0.01 * context.count
      return mat4.lookAt([],
        [30 * Math.cos(t), 2.5, 30 * Math.sin(t)],
        [0, 2.5, 0],
        [0, 1, 0])
    },
    projection: (props, context) => {
      return mat4.perspective([],
        Math.PI / 4,
        context.viewportWidth / context.viewportHeight,
        0.01,
        1000)
    },
    color:regl.prop('color')
  }
  ,


  /*stencil: {
    enable: true,
    mask: 0xff,
    func: {
      cmp: '<',
      ref: 0,
      mask: 0xff
    },
    opFront: {
      fail: 'keep',
      zfail: 'keep',
      pass: 'keep'
    },
    opBack: {
      fail: 'keep',
      zfail: 'keep',
      pass: 'keep'
    }
  }*/
  depth: {
    enable: true,
    mask: true,
    func: 'less',
    range: [0, 1024]
  }

})



const fxPass = regl({

  frag: `
    precision mediump float;
    uniform sampler2D texture;
    uniform float time;
    varying vec2 uv;
    void main () {
      vec4 color = texture2D(texture, uv);//texture2D(texture, sin(uv*time));
      gl_FragColor = mix(color,vec4(1,0,0,1),0.2);
    }`,

    vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main () {
      uv = position;
      gl_Position = vec4(2.0 * position - 1.0, 0, 1);
    }`,

    attributes: {
      position: regl.buffer([
        -2, 0,
        0, -2,
        2, 2])
    },

    uniforms: {
      texture: regl.prop('texture'),
      time: (props, {count}) => 0.01 * count
    },

    count: 3
  })


const mixPass = regl({

    frag: `
      precision mediump float;
      uniform sampler2D texture;
      uniform sampler2D texture2;
      uniform float ratio;
      varying vec2 uv;
      void main () {
        vec4 color = texture2D(texture, uv);
        vec4 color2 = texture2D(texture2, uv);
        gl_FragColor = mix(color, color2, ratio);
      }`,

      vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 uv;
      void main () {
        uv = position;
        gl_Position = vec4(2.0 * position - 1.0, 0, 1);
      }`,

      attributes: {
        position: regl.buffer([
          -2, 0,
          0, -2,
          2, 2])
      },

      uniforms: {
        texture: regl.prop('texture'),
        texture2: regl.prop('texture2'),
        ratio: regl.prop('ratio')
      },

      count: 3
    })

const {clear} = regl


const rb = regl.renderbuffer({
  format: 'depth'
})
console.log('rb',rb)

regl.frame(function (props, context) {
  clear({depth: 1, color: [0, 0, 0, 1]})
  drawBunny({color:[1,0,0,1]})
  rb({copy:true})
  depth({copy: true})
  fxPass({texture: depth})

  /*clear({depth:1, color:[0,0,0,1]})
  drawBunny({color:[0,0,1,1]})
  stencil({copy:true})

  clear({depth:1, color:[0,0,0,1]})*/
  //fxPass({texture: depth})
  //mixPass({texture:depth, texture2:stencil, ratio:0.7})

})
