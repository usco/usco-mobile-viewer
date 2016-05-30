float sdHexPrism( vec3 p, float h, float r)
{
    vec3 q = abs(p);
    #if 0
       return max(q.z-h,max((q.x*0.866025+q.y*0.5),q.y)-r);
    #else
       float d1 = q.z-h;
       float d2 = max((q.x*0.866025+q.y*0.5),q.y)-r;

       return length(max(vec2(d1,d2),0.0)) + min(max(d1,d2), 0.);
    #endif
}

/*float sdTriPrism( vec3 p, vec2 h )
{
    vec3 q = abs(p);
#if 0
    return max(q.z-h,max(q.x*0.866025+p.y*0.5,-p.y)-r*0.5);
#else
    float d1 = q.z-h;
    float d2 = max((q.x*0.866025+p.y*0.5),-p.y)-h.x*0.5;
    return length(max(vec2(d1,d2),0.0)) + min(max(d1,d2), 0.);
#endif
}*/

// TRI float d2 = max((q.x*0.866025+p.y*0.5),-p.y)-h.x*0.5;
// QUAD float d2 = max((q.x*0.866025+q.y),p.y)-r;


#pragma glslify: export(sdHexPrism)
