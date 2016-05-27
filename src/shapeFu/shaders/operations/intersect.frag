//intersect
float opIntersect( float d0, float d1){
  return max( d0,  d1 );
}

#pragma glslify: export(opIntersect)
