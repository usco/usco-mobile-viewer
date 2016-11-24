precision mediump float;

uniform float camNear, camFar;
uniform mat4 model, view, projection;

attribute vec3 position, normal;

varying vec3 fragNormal, fragPosition;
varying vec4 _worldSpacePosition;

#pragma glslify: zBufferAdjust = require('../../shaders/zBufferAdjust')

void main() {
  fragPosition = position;
  fragNormal = normal;
  vec4 worldSpacePosition = model * vec4(position, 1);
  _worldSpacePosition = worldSpacePosition;
  //gl_Position = projection * view * worldSpacePosition;

  vec4 glPosition = projection * view * model * vec4(position, 1);
  gl_Position = glPosition;
  //gl_Position = zBufferAdjust(glPosition, camNear, camFar);
}
