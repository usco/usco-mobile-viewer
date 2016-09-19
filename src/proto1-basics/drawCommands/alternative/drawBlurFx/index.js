export default function drawBlurFx (regl, params) {
  const {texture, filter_radius} = params


  //this is taken from https://github.com/regl-project/regl/blob/gh-pages/example/blur.js
  const drawBlur = regl({
    frag: `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D texture;
    uniform float wRcp, hRcp;
    #define R int(${filter_radius})
    void main() {
      float W =  float((1 + 2 * R) * (1 + 2 * R));
      vec3 avg = vec3(0.0);
      for (int x = -R; x <= +R; x++) {
        for (int y = -R; y <= +R; y++) {
          avg += (1.0 / W) * texture2D(texture, uv + vec2(float(x) * wRcp, float(y) * hRcp)).xyz;
        }
      }
      gl_FragColor = vec4(avg, 1.0);
    }`,

    vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = 0.5 * (position + 1.0);
      gl_Position = vec4(position, 0, 1);
    }`,
    attributes: {
      position: [ -4, -4, 4, -4, 0, 4 ]
    },
    uniforms: {
      texture,
      wRcp: ({viewportWidth}) => 1.0 / viewportWidth,
      hRcp: ({viewportHeight}) => 1.0 / viewportHeight
    },
    depth: { enable: false },
    count: 3
  })
  return drawBlur
}
