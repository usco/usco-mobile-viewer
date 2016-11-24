
vec4 zBufferAdjust(vec4 glPosition, float camNear, float camFar)
{
  glPosition.z = 2.0*log(glPosition.w/camNear)/log(camFar/camNear) - 1.;
  glPosition.z *= glPosition.w;
  return glPosition;
}

#pragma glslify: export(zBufferAdjust)
