//precision mediump float;
uniform sampler2D texture;
uniform vec2 iMouse;
uniform vec2 iResolution;
uniform float iGlobalTime;

uniform bool toggleSoftShadows;
uniform bool toggleAO;
uniform vec4 bgColor;

// ray marching
const int MAX_ITERATIONS = 512;
uniform int uRM_maxIterations;//for dynamicly settable stuff
uniform float uRM_stop_threshold;
uniform float uRM_grad_step;
uniform float uRM_clip_far;

// math
const float PI = 3.14159265359;
const float DEG_TO_RAD = PI / 180.0;

//lighting
struct Light {
  vec3 color;
  vec3 position;
  float intensity;
};
#define lightsNb 2
uniform Light lights[lightsNb];

uniform mat4 model, view, projection;


#pragma glslify: sdBox = require('./primitives/box.frag')
#pragma glslify: sdConeSection = require('./primitives/coneSection.frag')
#pragma glslify: opS = require('./operations/subtract.frag')
#pragma glslify: opU = require('./operations/union.frag')
//#pragma glslify: riceCup = require('./demo-data/riceCup.frag')
//#pragma glslify: basic = require('./demo-data/basic.frag')
//#pragma glslify: test = require('./demo-data/convTest.frag')
