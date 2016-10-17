/*precision mediump float;

uniform vec4 color;
varying vec3 vnormal;
varying vec3 fragNormal, fragPosition;

void main() {
  //gl_FragColor = color;
  gl_FragColor = vec4(abs(fragNormal), 1.0);
}*/



precision mediump float;
varying vec3 fragNormal;
uniform float ambientLightAmount;
uniform float diffuseLightAmount;
uniform vec4 color;
uniform vec3 lightDir;
uniform vec3 opacity;

void main () {
  vec2 foo[1] ;
  foo[0] = vec2(0.,1.);
  foo[1] = vec2(1.,0.);

  vec3 ambient = ambientLightAmount * color.rgb;
  float cosTheta = dot(fragNormal, lightDir);
  vec3 diffuse = diffuseLightAmount * color.rgb * clamp(cosTheta , 0.0, 1.0 );

  float v = 0.8; // shadow value
  gl_FragColor = vec4((ambient + diffuse * v), 1.);
}
