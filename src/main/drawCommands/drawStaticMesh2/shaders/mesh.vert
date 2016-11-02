precision mediump float;
attribute vec3 position, normal;
uniform mat4 model, view, projection;
varying vec3 fragNormal, fragPosition;

varying vec4 _worldSpacePosition;

float near = 10.;
float far = 5000.;
uniform float camNear, camFar;

void main() {
  fragPosition = position;
  fragNormal = normal;
  vec4 worldSpacePosition = model * vec4(position, 1);
  _worldSpacePosition = worldSpacePosition;
  gl_Position = projection * view * worldSpacePosition;


  gl_Position.z = 2.0*log(gl_Position.w/camNear)/log(camFar/camNear) - 1.;
  gl_Position.z *= gl_Position.w;
}
