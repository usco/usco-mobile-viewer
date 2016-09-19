

export default function drawFx (regl, params) {
  //const pixels = regl.texture()
  const {pixels} = params

  let uniforms = {
    tick: regl.prop('tick'),
    texture: pixels,
    textureSize: regl.prop('textureSize'),
    kernelWeight: 2
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
      //float size = textureSize(texture);
      gl_FragColor = vec4(texture2D(texture, uv)).rgba;

      /*vec2 onePixel = vec2(1.0, 1.0) / textureSize;
      vec4 colorSum =
       texture2D(texture, uv + onePixel * vec2(-1, -1)) * kernel[0] +
       texture2D(texture, uv + onePixel * vec2( 0, -1)) * kernel[1] +
       texture2D(texture, uv + onePixel * vec2( 1, -1)) * kernel[2] +
       texture2D(texture, uv + onePixel * vec2(-1,  0)) * kernel[3] +
       texture2D(texture, uv + onePixel * vec2( 0,  0)) * kernel[4] +
       texture2D(texture, uv + onePixel * vec2( 1,  0)) * kernel[5] +
       texture2D(texture, uv + onePixel * vec2(-1,  1)) * kernel[6] +
       texture2D(texture, uv + onePixel * vec2( 0,  1)) * kernel[7] +
       texture2D(texture, uv + onePixel * vec2( 1,  1)) * kernel[8] ;

    vec4 color =   vec4((colorSum / kernelWeight).rgb, 1.0);
    gl_FragColor = color;*/

    /*  gl_FragColor = (
       texture2D(texture, uv) +
       texture2D(texture, uv + vec2(onePixel.x, 0.0)) +
       texture2D(texture, uv + vec2(-onePixel.x, 0.0))) / 3.0;*/


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
