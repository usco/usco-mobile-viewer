precision mediump float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
uniform mat4 model, view, projection;
void main() {
 vUv = uv;
 gl_Position = projection * view * model * vec4(position, 1);
}
