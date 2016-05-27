//union
vec2 opU( vec2 d1, vec2 d2 )
{
	return (d1.x<d2.x) ? d1 : d2;
}

#pragma glslify: export(opU)


float opUnion( float d0, float d1){
  return min( d0,  d1 );
}
