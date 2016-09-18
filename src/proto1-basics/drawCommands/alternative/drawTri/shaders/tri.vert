precision mediump float;

attribute vec3 position;
uniform mat4 model, view, projection;
varying vec3 fragPosition;

void main() {
  fragPosition = position;
  gl_Position = projection * view * model * vec4(position, 1);
}

/*
precision mediump float;
attribute vec2 position;
uniform float angle;
void main() {
  gl_Position = vec4(
    cos(angle) * position.x + sin(angle) * position.y,
    -sin(angle) * position.x + cos(angle) * position.y, 0, 1);
}*/
