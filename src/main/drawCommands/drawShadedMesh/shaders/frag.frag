precision mediump float;
varying vec3 vNormal;
varying vec3 vShadowCoord;
uniform float ambientLightAmount;
uniform float diffuseLightAmount;
uniform vec4 color;
uniform sampler2D shadowMap;
uniform vec3 lightDir;
uniform float minBias;
uniform float maxBias;
uniform vec3 shadowColor;
uniform vec3 opactity;


void main () {
  vec3 ambient = ambientLightAmount * color.xyz;
  float cosTheta = dot(vNormal, lightDir);
  vec3 diffuse = diffuseLightAmount * color.xyz * clamp(cosTheta , 0.0, 1.0 );

  gl_FragColor = vec4((ambient + diffuse * v), 1.);// color.w);//1.-shadowColor.x

}
