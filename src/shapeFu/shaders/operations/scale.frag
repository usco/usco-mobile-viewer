float opScale( vec3 p, float s )
{
    return primitive(p/s)*s;
}
#pragma glslify: export(opS)
