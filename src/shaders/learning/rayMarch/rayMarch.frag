// Author:
// Title:
/*
disclaimer : this is not meant to be good code, but a learning process for me
going 'back to basic' and learning all about the needed maths, logic, etc

This shadertoy is very usefull to understand some of the basics:
https://www.shadertoy.com/view/XsB3Rm
This article (and the links within it) as well
http://9bitscience.blogspot.de/2013/07/raymarching-distance-fields_14.html
*/
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

const int maxSteps = 32;

// math
const float PI = 3.14159265359;
const float DEG_TO_RAD = PI / 180.0;

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
        sphere(pos+vec3(-1.,0.415,-0.271), 0.968),
        sphere(pos+vec3(0.405,0.195,0.250), 0.380)  //length(p) - 0.5; // Distance to sphere of radius 0.5
    ,0.1);
    d = min(d, sdBox(pos+vec3(0.044,0.570,0.001),vec3(1.033,1.460,0.000)));
    //d = min(d, sdCylinder(pos+vec3(0.1), vec3(0.074,0.180,0.235)));

    float d0 = sphere( pos, 2.4 );

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
        	return far;//return far so we can discard it down the line ...clunky ?
        }
    }

    //we have not bailed out so far, max distance reached
    return far;
}


vec3 rayDir(float fov, vec2 size, vec2 pos ) {
	vec2 xy = pos - size * 0.5;//negate, map to half space ? so instead of a point in 0.0,1.0

	float cot_half_fov = tan( ( 90.0 - fov * 0.5 ) * DEG_TO_RAD );
	float z = size.y * 0.5 * cot_half_fov;//half size along y times half fov to get z value

	return normalize( vec3( xy, -z ) );//normalize on 0,1
}

vec3 crapRayDir(vec2 size, vec2 pos, vec3 eye){

    vec3 right = vec3(1, 0, 0);
	vec3 up = vec3(0, 1, 0);

    vec2 uv =  (gl_FragCoord.xy * 2.0 / u_resolution) - 1.0;//centered on 0 in a -1. ,1. range

    float eyeOffsetToPlane = 0.624;
    vec3 forward = vec3(0,0,1.);

    vec3 rayOrigin = eye + forward * eyeOffsetToPlane + right * uv.x + up * uv.y;//ray origin ???
    vec3 eyeOffset = eye*eyeOffsetToPlane;
    vec3 rayDirection = normalize(eyeOffset-rayOrigin);//cross(right, up));// ray direction ? seem to take norm of perpendicular
	return rayDirection;
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


//TODO: try and understand this
vec3 gradient( vec3 pos ) {
    const float grad_step = 0.2;
	const vec3 dx = vec3( grad_step, 0.0, 0.0 );
	const vec3 dy = vec3( 0.0, grad_step, 0.0 );
	const vec3 dz = vec3( 0.0, 0.0, grad_step );
	return normalize (
		vec3(
			generatDistanceFields( pos + dx ) - generatDistanceFields( pos - dx ),
			generatDistanceFields( pos + dy ) - generatDistanceFields( pos - dy ),
			generatDistanceFields( pos + dz ) - generatDistanceFields( pos - dz )
		)
	);
}

void main()
{
    vec3 eye =  vec3(0.,0.,10.0);//vec3(cos(u_time*2.),sin(u_time*2.),-10);
    float near = 0.0;
    float far = 1000.0;
    vec4 background = vec4(0.940,0.714,0.266,1.0); // background color


    vec3 rayDirection = rayDir(25., u_resolution.xy, gl_FragCoord.xy );

	float depth = rayMarch(eye, rayDirection, near, far);

    vec3 pos = eye + rayDirection * depth;//*10.+cos(u_time/2.);//;
    vec3 norm =  gradient(pos);//lightShade(eye, pos);



    //gl_FragColor = vec4(vec3(depth),1.)+background; //only works if we return 0. instead of far from rayMarch
    gl_FragColor = vec4(norm, 1.)+background;

}
