precision mediump float;

uniform vec4 color;
varying vec3 vnormal;
varying vec3 fragNormal, fragPosition;

void main() {
  gl_FragColor = color;
}
