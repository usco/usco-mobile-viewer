//union
/*vec2 opU( vec2 d1, vec2 d2 )
{

}*/
float opU( float d1, float d2 )
{
    return min(d1,d2);
}
#pragma glslify: export(opU)
