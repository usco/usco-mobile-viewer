precision mediump float;
uniform sampler2D texture;
uniform vec2 iMouse;
uniform vec2 iResolution;
uniform float iGlobalTime;

uniform bool toggleSoftShadows;
uniform bool toggleAO;
uniform vec4 bgColor;

// ray marching
const int MAX_ITERATIONS = 512;
uniform int uRM_maxIterations;//for dynamicly settable stuff
uniform float uRM_stop_threshold;
uniform float uRM_grad_step;
uniform float uRM_clip_far;

// math
const float PI = 3.14159265359;
const float DEG_TO_RAD = PI / 180.0;

//lighting
struct Light {
  vec3 color;
  vec3 position;
  float intensity;
};
#define lightsNb 2
uniform Light lights[lightsNb];

uniform mat4 model, view, projection;


#pragma glslify: sdBox = require('./primitives/box.frag')
#pragma glslify: sdConeSection = require('./primitives/coneSection.frag')
#pragma glslify: opS = require('./operations/subtract.frag')
#pragma glslify: opU = require('./operations/union.frag')
#pragma glslify: opI = require('./operations/intersect.frag')
#pragma glslify: opR = require('./operations/rotate.frag')


float testShape(vec3 pos){
  float foo0 = sdBox(pos + vec3(0.,0.,0.), vec3(14.,2.,18.));
  float foo1 = sdConeSection(pos, 4., 14., 14.);
  foo0 = opS(foo0,foo1);
  foo0 = foo0 + (sin(0.2*pos.x)); //*cos(iGlobalTime));//*sin(2.*pos.y)*sin(20.*pos.y)

  return foo0;
}

// get distance in the world
float dist_field( vec3 pos ) {

  float varia = iGlobalTime*0.2;
  //varia = 0.9;

  vec3 scale = vec3(1.);// vec3(2.4,0.4,0.2);

  pos += vec3(2.,3,10);
  pos = opR(pos,vec3(40.,10.,PI*2.)); //rotate
  pos = pos/scale;//scale


  /*float foo0 = sdBox(pos + vec3(0.,0.,0.), vec3(14.,2.,18.));
  float foo1 = sdConeSection(pos, 4., 14., 14.);
  foo0 = opS(foo0,foo1);
  foo0 = foo0 + (sin(0.2*pos.x)); //*cos(iGlobalTime));//*sin(2.*pos.y)*sin(20.*pos.y)

  foo0 = opI(foo0, sdBox(pos+vec3(0,cos(varia)*2.,0),vec3(20,0.1,20)));*/
  float shape = testShape(pos);

  //get outlines
  vec3 borderScale = vec3(0.999);
  float inner = testShape(pos/borderScale) * min(min(borderScale.x,borderScale.y),borderScale.z);
  //shape *= min(min(scale.x,scale.y),scale.z);//wooh !! non unfirorm scaling !
  //single slice
  shape = opI(shape, sdBox(pos+vec3(0,cos(varia)*2.,0),vec3(20,0.1,20)));
  shape = opS(shape, inner);

  return shape;


	/*vec3 offset = vec3(0,0,0);
	// object 0 : sphere
	float d0 = dist_sphere( pos+offset, 2.7 );

	// object 1 : cube
	float d1 = dist_box( pos+offset, vec3( 2.0 ) );

	// union     : min( d0,  d1 )
	// intersect : max( d0,  d1 )
	// subtract  : max( d1, -d0 )
	return opSubtract(d0, d1);*/
}

// phong shading
vec3 shading( vec3 v, vec3 n, vec3 eye ) {
	float shininess = 200.0;

	vec3 ev = normalize( v - eye );
	vec3 ref_ev = reflect( ev, n );

  vec3 light = vec3(0.2); // ambient ??
  for (int i = 0; i < lightsNb; ++i) {
     vec3 lightDir = normalize(lights[i].position - v);
     float diffuse = max(0.0, dot(lightDir, n));
		 float specular = max( 0.0, dot( lightDir, ref_ev ) );
		 specular = pow( specular, shininess );

     light += lights[i].color * ( diffuse + specular )* lights[i].intensity; //diffuse * lights[i].color * lights[i].intensity;
  }
	return light;
}

// get gradient in the world
vec3 gradient( vec3 pos ) {
 	vec3 dx = vec3( uRM_grad_step, 0.0, 0.0 );
	vec3 dy = vec3( 0.0, uRM_grad_step, 0.0 );
	vec3 dz = vec3( 0.0, 0.0, uRM_grad_step );
	return normalize (
		vec3(
			dist_field( pos + dx ) - dist_field( pos - dx ),
			dist_field( pos + dy ) - dist_field( pos - dy ),
			dist_field( pos + dz ) - dist_field( pos - dz )
		)
	);
}

// ray marching
float ray_marching( vec3 origin, vec3 dir, float start, float end ) {
	float depth = start;
	for ( int i = 0; i < MAX_ITERATIONS; i++ ) {
		//if(i < uRM_maxIterations){
			float dist = dist_field( origin + dir * depth );
			if ( dist < uRM_stop_threshold ) {
				return depth;
			}
			depth += dist;
			if ( depth >= end) {
				return end;
			}
		//}

	}
	return end;
}

// get ray direction
vec3 ray_dir( float fov, vec2 size, vec2 pos ) {
	vec2 xy = pos - size * 0.5;

	float cot_half_fov = tan( ( 90.0 - fov * 0.5 ) * DEG_TO_RAD );
	float z = size.y * 0.5 * cot_half_fov;

	return normalize( vec3( xy, -z ) );
}

// camera rotation : pitch, yaw
mat3 rotationXY( vec2 angle ) {
	vec2 c = cos( angle );
	vec2 s = sin( angle );

	return mat3(
		c.y      ,  0.0, -s.y,
		s.y * s.x,  c.x,  c.y * s.x,
		s.y * c.x, -s.x,  c.y * c.x
	);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	// default ray dir
	vec3 dir = ray_dir( 45.0, iResolution.xy, fragCoord.xy );

	// default ray origin
	vec3 eye = vec3( 0.0, 0.0, 10.0 );

	// rotate camera
	//mat3 rot = rotationXY( vec2( iGlobalTime ) );//
  mat3 rot = mat3(view);
	dir = rot * dir;
	eye = rot * eye * 5.;

	// ray marching
	float depth = ray_marching( eye, dir, 0.0, uRM_clip_far );
	if ( depth >= uRM_clip_far ) {
		fragColor = bgColor;
        return;
	}

	// shading
	vec3 pos = eye + dir * depth;
	vec3 n = gradient( pos );
	fragColor = vec4( shading( pos, n, eye ), 1.0 );
}

void main () {


	vec4 color = bgColor;
  mainImage( color, gl_FragCoord.xy );
  color.w = 1.0;
  gl_FragColor = color;
}
