const float PI = 3.14159265359;

#pragma glslify: sdBox = require('../primitives/box.frag')
#pragma glslify: sdConeSection = require('../primitives/coneSection.frag')

#pragma glslify: opS = require('../operations/subtract.frag')


float riceCup( vec3 pos ) {

/* test from openscad
$fa=0.1;

BASE=55;
TOP=BASE*1.2;
AVGDIAM=(BASE+TOP)/2;
VOLUME=180000;
PI=3.14159;
HEIGHT=VOLUME/((AVGDIAM/2)*(AVGDIAM/2)*PI);

WALLS=2;

echo( "Interior base diameter:", BASE );
echo( "Interior top diameter: ", TOP );
echo( "Interior average diameter: ", AVGDIAM );
echo( "Interior height: ", HEIGHT );

difference() {
  // rice cup exterior
  translate( v=[0,0,(HEIGHT+WALLS)/2] ) {
    cube( size=[HEIGHT+(WALLS*3),HEIGHT+(WALLS*3),HEIGHT+WALLS], center=true );
  }
  // rice cup interior
  translate( v=[0,0,WALLS+0.01] ) {
    cylinder(r1=(BASE/2),r2=(TOP/2),h=HEIGHT);
  }
}

*/
float BASE = 55.;
float TOP = BASE*1.2;
float AVGDIAM = (BASE*TOP)/2.;
float VOLUME = 180000.;
float HEIGHT = VOLUME/((AVGDIAM/2.)*(AVGDIAM/2.)*PI);
float WALLS = 2.;

// rice cup exterior
vec3 cu1_offset = vec3(0,-(HEIGHT+WALLS)/2.,0);//
float cu1 = sdBox( pos+cu1_offset, vec3( HEIGHT+(WALLS*3.), HEIGHT+WALLS, HEIGHT+(WALLS*3.) ) );

// rice cup interior
vec3 c1_offset = vec3(0,-(WALLS+0.01+HEIGHT/2.),0);
float c1 = sdConeSection(pos+c1_offset, HEIGHT, BASE/2., TOP/2.);
//sdCylinder(pos+c1_offset, vec2(BASE/2.,HEIGHT) );
//cylinder(r1=(BASE/2),r2=(TOP/2),h=HEIGHT);

float result = opS(cu1, c1);
//result = cu1;
result = c1;
//result = opUnion(c1, cu1);
return result;
}

#pragma glslify: export(riceCup)
