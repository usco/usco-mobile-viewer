#pragma glslify: sdBox = require('../primitives/box.frag')
#pragma glslify: sdConeSection = require('../primitives/coneSection.frag')
#pragma glslify: opS = require('../operations/subtract.frag')
#pragma glslify: opU = require('../operations/union.frag')
float root(vec3 pos){
return sdConeSection(pos, 4., 3., 3.);
}
#pragma glslify: export(root)