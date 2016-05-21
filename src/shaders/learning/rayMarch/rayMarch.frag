// Author:
// Title:
/*
disclaimer : this is not meant to be good code, but a learning process for me
going 'back to basic' and learning all about the needed maths, logic, etc

This shadertoy is very usefull to understand some of the basics:
https://www.shadertoy.com/view/XsB3Rm
This article (and the links within it) as well
http://9bitscience.blogspot.de/2013/07/raymarching-distance-fields_14.html

//VERY IMPORTANT: figure out the logic behind min & max for distance field operations
*/
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

const int maxSteps = 32;
const float cutThreshold = 0.001;
const float clipNear = 0.1;
const float clipFar = 1000.;


// math
const float PI = 3.14159265359;
const float DEG_TO_RAD = PI / 180.0;

//various tools
float rand1(float n){return fract(sin(n));}


float defaultDist(vec3 pos){
    return length(pos);
}
float manhaDist(vec3 pos){
    return pos.x + pos.y + pos.z;
}
/*float length2(vec3 pos){
    float n = 2.;
	return (pos.x^n+pos.y^n+pos.z^n)^(1/n);
}*/
float dist(vec3 pos){
    return defaultDist(pos);
}

float sphere(in vec3 p, float radius){
	return dist(p) - radius; // Distance to sphere of radius r
}

float sdBox( in vec3 p, vec3 b )
{
  	vec3 d = abs(p) - b;//absolute distance to point - bounds
	//max(d.y,d.z) => what is bigger , dimension along y or z
  	//max(d.x, max(d.y,d.z) => what is bigger dimension along x, y or z
    //min(XX, 0.0) => what is smaller the above or 0 ? ie what is closest to the point
    //length(max(d,0.0)) => what is the length of biggest between 0 & the distance
  return min(max(d.x, max(d.y,d.z)),0.0) + //
         dist(max(d,0.0));
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
        sphere(pos+vec3(-1.,0.515,-0.271), 0.968),
        sphere(pos+vec3(0.005,0.295,0.250), 0.480)  //length(p) - 0.5; // Distance to sphere of radius 0.5
    ,0.1);



    const int cuts = 12;
    for(int i=0;i<cuts;++i)
	{
        float size = .4;//rand1(float(i))*0.8;
        vec3 posCut = vec3(sin(float(i))-0.9,0.6,cos(float(i)-0.8));
        d= max(d, -sphere(pos+posCut, size ));
    }
    float b1 = sdBox(pos+vec3(0.044,0.570,0.001),vec3(1.033,1.460,abs(cos(u_time*0.5))) );
    d = max(d, b1);//0.1

    //d = min(d, sdCylinder(pos+vec3(0.1), vec3(0.074,0.180,0.235)));

    //float d0 = sphere( pos, 2.4 );

    return d;
}

//RAY MARCH one two !
float rayMarch(vec3 origin, vec3 direction, float near, float far){
    float threshold = cutThreshold;
	float depth = near;//start at near

    for(int i = 0; i < maxSteps; ++i)
    {
        float distance = generatDistanceFields(origin + direction * depth);
        if(distance < threshold)
        {
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

//light attempt 1 (very interesting results )
vec3 lightShade(in vec3 pos, in vec3 normal){
    //vec3 normal = vec3(1);//norm(p);
    vec3 result = vec3(0.3);//base color

    vec3 light1Pos = vec3(0,1,2);//vec3(cos(u_time*5.)*4.,sin(u_time*5.)*4., 2);//
    vec3 light1Col = vec3(1.0);

    vec3 light2Pos = vec3(3,1,0);//vec3(cos(u_time*5.)*4.,sin(u_time*5.)*4., 2);//
    vec3 light2Col = vec3(0.6,0,0);

    {
        vec3 lightDir = normalize(light1Pos - pos);//put in same space as pos ? direction of light hiting point p
    	result += light1Col * dot(normal, lightDir);
    }
    {
        vec3 lightDir = normalize(light2Pos - pos);//put in same space as pos ? direction of light hiting point p
    	result += light2Col * dot(normal, lightDir);
    }


    return result;
}

//TODO: try and understand this
/* for each 3d point (pos) based on each pixel
	- take gradient step
    - create 3x3 matrix diagonal matrix with gradient steps as values
    - return a normalized vec3
      x: distField(pos + offset along x) - distField(pos - offset along x)
      y: distField(pos + offset along y) - distField(pos - offset along y)
      z: distField(pos + offset along z) - distField(pos - offset along z)

    Are these normals ? all it does is compute the difference between the distances fields two adjacent 'points'
	in each dimension ?
    It seems to me this is really just a gradient ? ie like a heightmap ?
*/
vec3 gradient( vec3 pos ) {
    const float grad_step = 0.01;//try changing this, interesting effects on cubes, almost non on sphere
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


//once again from https://www.shadertoy.com/view/XsB3Rm
mat3 rotationXY( vec2 angle ) {
	vec2 c = cos( angle );
	vec2 s = sin( angle );

	return mat3(
		c.y      ,  0.0, -s.y,
		s.y * s.x,  c.x,  c.y * s.x,
		s.y * c.x, -s.x,  c.y * c.x
	);
}

void main()
{
    vec3 eye =  vec3(0.,0.,10.0);//vec3(cos(u_time*2.),sin(u_time*2.),-10);
    float near = clipNear;
    float far = clipFar;
    vec4 background = vec4(0.940,0.910,0.901,1.000); // background color

    vec3 rayDirection = rayDir(25., u_resolution.xy, gl_FragCoord.xy );

    mat3 rot = rotationXY( vec2( -u_mouse.y/80.+15., -u_mouse.x/80.+20. ) );
    //mat3 rot = rotationXY( vec2( 15., -90. ) );
	rayDirection = rot * rayDirection;
	eye = rot * eye;

	float depth = rayMarch(eye, rayDirection, near, far);

    vec3 pos = eye + rayDirection * depth;//*10.+cos(u_time/2.);//;
    vec3 norm =  gradient(pos);
    norm = lightShade(eye, norm);


    //gl_FragColor = vec4(vec3(depth),1.)+background; //only works if we return 0. instead of far from rayMarch
    gl_FragColor = vec4(norm, 1.)+background;

}
