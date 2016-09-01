
export default function drawDepth(regl, params) {
  const {fbo} = params
  return regl({
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
}
