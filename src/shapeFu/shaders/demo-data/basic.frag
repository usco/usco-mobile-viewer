const float PI = 3.14159265359;

#pragma glslify: sdBox = require('../primitives/box.frag')
#pragma glslify: opS = require('../operations/subtract.frag')


float basic( vec3 pos ) {
  return sdBox(pos,vec3(4));
}

#pragma glslify: export(basic)
