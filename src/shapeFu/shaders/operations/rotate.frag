#pragma glslify: opRotX = require('./rotateX.frag')
#pragma glslify: opRotY = require('./rotateY.frag')
#pragma glslify: opRotZ = require('./rotateZ.frag')


vec3 opR( vec3 p, vec3 angle )
{
	if(angle.x ==0. && angle.y ==0. && angle.z ==0.){
		return p;
	}else{
	 return opRotZ(opRotY(opRotX(p,radians(angle.x)),radians(angle.z)),radians(angle.y));
  }
}

#pragma glslify: export(opR)
