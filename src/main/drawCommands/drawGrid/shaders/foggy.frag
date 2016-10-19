precision mediump float;
uniform vec4 color;
varying vec3 vnormal;
varying vec3 fragNormal, fragPosition;

#define FOG_DENSITY 0.03
#pragma glslify: fog_exp2 = require(glsl-fog/exp2)
#pragma glslify: fog_exp = require(glsl-fog/exp)

void main() {
  float fogDistance = gl_FragCoord.z / gl_FragCoord.w;
  float fogAmount = fog_exp(fogDistance * 0.1, FOG_DENSITY);
  const vec4 fogColor = vec4(1.0); // white

  //vec4 mainColor = mix( vec4(light, 1), color, 0.6);
  vec4 mainColor = color;
  gl_FragColor = mix(mainColor, fogColor, fogAmount);
}
