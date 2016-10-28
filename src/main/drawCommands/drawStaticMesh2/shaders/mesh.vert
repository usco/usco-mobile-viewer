precision mediump float;
attribute vec3 position, normal;
uniform mat4 model, view, projection;
varying vec3 fragNormal, fragPosition;

varying vec4 _worldSpacePosition;

void main() {
  fragPosition = position;
  fragNormal = normal;
  vec4 worldSpacePosition = model * vec4(position, 1);
  _worldSpacePosition = worldSpacePosition;
  gl_Position = projection * view * worldSpacePosition;
}
