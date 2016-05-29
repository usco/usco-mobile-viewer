#pragma glslify: sdBox = require('../primitives/box.frag')
#pragma glslify: sdConeSection = require('../primitives/coneSection.frag')
#pragma glslify: opS = require('../operations/subtract.frag')
#pragma glslify: opU = require('../operations/union.frag')
float root(vec3 pos)
{
pos += vec3(2,3,10);
float foo0 = sdBox(pos + vec3(0.,0.,0.), vec3(14.,2.,18.));
float foo1 = sdConeSection(pos, 4., 14., 14.);
return opS(foo0,foo1);
}
#pragma glslify: export(root)