#pragma glslify: opRotX = require('./rotateX.frag')
#pragma glslify: opRotY = require('./rotateY.frag')
#pragma glslify: opRotZ = require('./rotateZ.frag')


vec3 opR( vec3 p, vec3 angle )
{

	 return opRotZ(opRotY(opRotX(p,radians(angle.x)),radians(angle.y)),radians(angle.z+90.));

}

#pragma glslify: export(opR)
