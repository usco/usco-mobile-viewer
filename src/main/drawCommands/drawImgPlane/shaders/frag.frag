precision mediump float;
 varying vec2 vUv;
 uniform sampler2D texture;
 uniform vec4 color;

vec4 colorize(in vec4 color, in vec4 modColor)
{
  float average = (color.r + color.g + color.b) / 3.0;
  return vec4(modColor.r, modColor.g, modColor.b, color.a);
}
 void main () {
   gl_FragColor = colorize(texture2D(texture,vUv), color);//*vec4(1.,0,0,1);
 }
