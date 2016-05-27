vec3 opRotX( vec3 p, float angle )
{
	float  c = cos(angle);
	float  s = sin(angle);
	mat2   m = mat2(c,-s,s,c);
	return vec3(m*p.yz,p.x);
}

#pragma glslify: export(opRotX)
