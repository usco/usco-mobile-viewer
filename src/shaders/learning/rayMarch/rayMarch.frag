// Author:
// Title:
/*
disclaimer : this is not meant to be good code, but a learning process for me
going 'back to basic' and learning all about the needed maths, logic, etc
*/
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

const int maxSteps = 30;


float sphere(in vec3 p, float radius){
	return length(p) - radius; // Distance to sphere of radius r
}

float sdBox( in vec3 p, vec3 b )
{
  	vec3 d = abs(p) - b;//absolute distance to point - bounds
	//max(d.y,d.z) => what is bigger , dimension along y or z
  	//max(d.x, max(d.y,d.z) => what is bigger dimension along x, y or z
    //min(XX, 0.0) => what is smaller the above or 0 ? ie what is closest to the point
    //length(max(d,0.0)) => what is the length of biggest between 0 & the distance
  return min(max(d.x, max(d.y,d.z)),0.0) + //
         length(max(d,0.0));
}

float sdCylinder( vec3 p, vec3 c )
{
  return length(p.xz-c.xy)-c.z;//length to xz - cylinders's xy ? c.z is height I guess?
}

// polynomial smooth min (k = 0.1);
float smin( float a, float b, float k )
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}


float generatDistanceFields(vec3 pos){
    float d = 0.;
 	d= smin(
        sphere(pos+vec3(0.154,0.415,0.371), 0.160),
        sphere(pos+vec3(0.405,0.195,0.250), 0.380)  //length(p) - 0.5; // Distance to sphere of radius 0.5
    ,0.1);
    d = max(d, sdBox(pos+vec3(0.044,0.570,0.001),vec3(0.433,1.000,-.0)));
    d = min(d, sdCylinder(pos+vec3(0.1), vec3(0.074,0.180,0.235)));
    return d;
}

//RAY MARCH one two !
float rayMarch(vec3 origin, vec3 direction, float near, float far){
    float threshold = 0.001;
	float depth = near;//start at near

    for(int i = 0; i < maxSteps; ++i)
    {
        float distance = generatDistanceFields(origin + direction * depth);
        if(distance < threshold)
        {
            /*color = mix( vec4(colorGradient(i,maxSteps), 2.024), color, 0.868); // Sphere color
            //color = vec4(colorGradient(i, maxSteps),1.);
            color = color + vec4(colorGradient(i,maxSteps), 2.024)*0.01;*/
            //break;
            return depth;
        }

        depth += distance;

        if(depth >= far){
        	return 0.;
        }
    }

    //we have not bailed out so far, max distance reached
    return far;
}



//color gradient between blue and red based on iteration
vec3 colorGradient(int iter, int totalSteps){
    vec3 mixed = mix(vec3(0.044,0.000,1.000), vec3(1.000,0.253,0.176), float(totalSteps/iter));
    return mixed;
}

//light attempt 1
vec3 lightShade(in vec3 p, in vec3 normal){
    //vec3 normal = vec3(1);//norm(p);

    vec3 light1Pos = vec3(0);
    vec3 light1Col = vec3(1.0);

    vec3 lightDir = normalize(light1Pos - p);
    vec3 result = light1Col * dot(normal, lightDir);

    return result;
}
vec3 light(vec3 pos, vec3 color){
    return vec3(1.);
}

void main()
{
    vec3 eye =  vec3(0.,0.,100.0);//vec3(cos(u_time*2.),sin(u_time*2.),-10);
    vec3 up = vec3(0, 1, 0);
    vec3 right = vec3(1, 0, 0);
	float near = 0.0;
    float far = 1000.0;

    vec2 uv =  (gl_FragCoord.xy * 2.0 / u_resolution) - 1.0;//centered on 0 in a -1. ,1. range

    float eyeOffsetToPlane = 0.360;
    vec3 forward = vec3(0,0,1.);

    vec3 rayOrigin = eye + forward * eyeOffsetToPlane + right * uv.x + up * uv.y;//ray origin ???
    vec3 eyeOffset = eye*eyeOffsetToPlane;
    vec3 rayDirection = normalize(eyeOffset-rayOrigin);//cross(right, up));// ray direction ? seem to take norm of perpendicular

    vec4 color = vec4(0.4); // Sky color

	float depth = rayMarch(rayOrigin, rayDirection, near, far);

    //vec3 pos = eye + rayDirection * depth;
    //vec3 norm = lightShade(ro, pos);
    color = vec4(vec3(depth),1.);

    gl_FragColor = color;
}
