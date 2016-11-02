precision mediump float;

uniform float camNear, camFar;
uniform mat4 model, view, projection;

attribute vec3 position;
varying vec3 fragNormal, fragPosition;

#pragma glslify: zBufferAdjust = require('./zBufferAdjust')

void main() {
  //fragNormal = normal;
  fragPosition = position;
  vec4 glPosition = projection * view * model * vec4(position, 1);
  gl_Position = glPosition;
  //gl_Position = zBufferAdjust(glPosition, camNear, camFar);
}
