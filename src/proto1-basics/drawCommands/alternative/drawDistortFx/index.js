export default function drawDistortFx (regl, params) {
  const {texture} = params

  let uniforms = {
    tick: regl.prop('tick'),
    texture,
    textureSize: regl.prop('textureSize')
  }

  for (let i = 0; i < 9; ++i) {
    uniforms[`kernel[${i}]`] = (context, props) => props.kernel[i] }

  console.log('uniform', uniforms)

  return regl({
    frag: `
    precision mediump float;
    uniform sampler2D texture;
    uniform vec2 textureSize;

    float radius = 3.;
    uniform float kernel[9];
    uniform float kernelWeight;


    uniform float tick;
    varying vec2 uv;

    void main () {
      float frequency=100.0*tick;
      float amplitude=0.003*tick;
      float distortion=sin(uv.y*frequency+tick*10.)*amplitude;
      vec4 color=texture2D(texture,vec2(uv.x+distortion,uv.y));

      gl_FragColor = color;
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
      position: [
        -2, 0,
        0, -2,
        2, 2]
    },

    uniforms,
    count: 3
  })
}
