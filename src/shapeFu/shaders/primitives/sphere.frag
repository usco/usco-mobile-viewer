//sphere
float sdSphere( vec3 p, float s )
{
    return length(p)-s;
}
#pragma glslify: export(sdSphere)


float dist_sphere( vec3 pos, float r ) {
	return length( pos ) - r;
}
