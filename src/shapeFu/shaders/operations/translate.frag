//subtract
/*vec3 opTx( vec3 p, mat4 m )
{
    vec3 q = invert(m)*p;
    return primitive(q);
}
*/

vec3 opT( vec3 p, vec3 t )
{
    mat4 m = mat4(1.)
    m[12] = m[0] * t.x + m[4] * t.y + m[8] * t.z + m[12];
    m[13] = m[1] * t.x + m[5] * t.y + m[9] * t.z + m[13];
    m[14] = m[2] * t.x + m[6] * t.y + m[10] * t.z + m[14];
    m[15] = m[3] * t.x + m[7] * t.y + m[11] * t.z + m[15];

    vec3 q = invert(m)*p;
    return q
    //return primitive(q);
}

#pragma glslify: export(opT)
