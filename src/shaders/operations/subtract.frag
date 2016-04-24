//subtract
float opS( float d1, float d2 )
{
    return max(-d2,d1);
}

/*float opS( vec2 d1, vec2 d2 )
{
    return max(-d2,d1);
}*/

#pragma glslify: export(opS)
