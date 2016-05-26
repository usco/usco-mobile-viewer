/*precision mediump float;
uniform mat4 model, view, projection;
attribute vec3 position;
attribute vec3 normal;
varying vec3 vnormal;
void main() {
  vnormal = normal;
  gl_Position = projection * view * model * vec4(position, 1);
}*/


precision mediump float;
attribute vec3 position, normal;
uniform mat4 model, view, projection;
varying vec3 fragNormal, fragPosition;

void main() {
 fragNormal = normal;
 fragPosition = position;
 gl_Position = projection * view * model * vec4(position, 1);
}
