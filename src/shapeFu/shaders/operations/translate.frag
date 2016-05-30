//subtract
/*vec3 opTx( vec3 p, mat4 m )
{
    vec3 q = invert(m)*p;
    return primitive(q);
}
*/
// from https://github.com/dsheets/gloc/blob/master/stdlib/matrix.glsl
/*mat2 transpose(mat2 m) {
  return mat2(  m[0][0], m[1][0],   // new col 0
                m[0][1], m[1][1]    // new col 1
             );
  }

mat3 transpose(mat3 m) {
  return mat3(  m[0][0], m[1][0], m[2][0],  // new col 0
                m[0][1], m[1][1], m[2][1],  // new col 1
                m[0][2], m[1][2], m[2][2]   // new col 1
             );
  }

mat4 transpose(mat4 m) {
  return mat4(  m[0][0], m[1][0], m[2][0], m[3][0],   // new col 0
                m[0][1], m[1][1], m[2][1], m[3][1],    // new col 1
                m[0][2], m[1][2], m[2][2], m[3][2]    // new col 1
             );
  }

float determinant(mat2 m) {
  return m[0][0]*m[1][1] - m[1][0]*m[0][1] ;
  }

float determinant(mat3 m) {
  return   m[0][0]*( m[1][1]*m[2][2] - m[2][1]*m[1][2])
         - m[1][0]*( m[0][1]*m[2][2] - m[2][1]*m[0][2])
         + m[2][0]*( m[0][1]*m[1][2] - m[1][1]*m[0][2]) ;
  }

// 4x4 determinate inplemented by blocks ..
//     | A B |
// det | C D | = det (A) * det(D - CA'B)
//

float determinant(mat4 m) {
  mat2 a = mat2(m);
  mat2 b = mat2(m[2].xy,m[3].xy);
  mat2 c = mat2(m[0].zw,m[1].zw);
  mat2 d = mat2(m[2].zw,m[3].zw);
  float s = determinant(a);
  return s*determinant(d-(1.0/s)*c*mat2(a[1][1],-a[0][1],-a[1][0],a[0][0])*b);
  }

mat2 inverse(mat2 m) {
  float d = 1.0 / determinant(m) ;
  return d * mat2( m[1][1], -m[0][1], -m[1][0], m[0][0]) ;
  }

mat3 inverse(mat3 m) {
  float d = 1.0 / determinant(m) ;
  return d * mat3( m[2][2]*m[1][1] - m[1][2]*m[2][1],
                    m[1][2]*m[2][0] - m[2][2]*m[1][0],
                     m[2][1]*m[1][0] - m[1][1]*m[2][0] ,

                   m[0][2]*m[2][1] - m[2][2]*m[0][1],
                    m[2][2]*m[0][0] - m[0][2]*m[2][0],
                     m[0][1]*m[2][0] - m[2][1]*m[0][0],

                   m[1][2]*m[0][1] - m[0][2]*m[1][1],
                    m[0][2]*m[1][0] - m[1][2]*m[0][0],
                     m[1][1]*m[0][0] - m[0][1]*m[1][0]
                 );
  }

mat4 inverse(mat4 m) {
  mat2 a = inverse(mat2(m));
  mat2 b = mat2(m[2].xy,m[3].xy);
  mat2 c = mat2(m[0].zw,m[1].zw);
  mat2 d = mat2(m[2].zw,m[3].zw);

  mat2 t = c*a;
  mat2 h = inverse(d - t*b);
  mat2 g = - h*t;
  mat2 f = - a*b*h;
  mat2 e = a - f*t;

  return mat4( vec4(e[0],g[0]), vec4(e[1],g[1]),
                  vec4(f[0],h[0]), vec4(f[1],f[1]) );
  }
*/
vec3 opT( vec3 p, vec3 t )
{
    mat4 m = mat4(1.);
    vec4 f = vec4(p,1.);

    /*m[3][0] = m[0][0] * t.x + m[1][0] * t.y + m[2][0] * t.z + m[3][0];
    m[3][1] = m[0][1] * t.x + m[1][1] * t.y + m[2][1] * t.z + m[3][1];
    m[3][2] = m[0][2] * t.x + m[1][2] * t.y + m[2][2] * t.z + m[3][2];
    m[3][3] = m[0][3] * t.x + m[1][3] * t.y + m[2][3] * t.z + m[3][3];*/

    /*f.x = m[0][0] * t.x + m[1][0] * t.y + m[2][0] * t.z + m[3][0];
    f.y = m[0][1] * t.x + m[1][1] * t.y + m[2][1] * t.z + m[3][1];
    f.z = m[0][2] * t.x + m[1][2] * t.y + m[2][2] * t.z + m[3][2];
    f.w = m[0][3] * t.x + m[1][3] * t.y + m[2][3] * t.z + m[3][3];*/

    //vec4 q1 = inverse(m)*f ;
    vec3 q = p + t;
    return q;
    //return primitive(q);
}

#pragma glslify: export(opT)
