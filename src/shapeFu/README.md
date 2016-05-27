## shape-fu

SDF based modeling:

### first prototype:

#### objectives

- basic modeling : the usual suspects
  - shapes: cube, sphere, cylinder(cone)
  - operations: union, subtract, intersect
  - limits ?
- import : NO
- export : yes, see marching cubes etc
- openGL vs webGL aka desktop vs browser: try to run the 'same' shader code on deskopt to see if there is a significant speedup

#### results:

- basic modeling:
  - Basic raymarching: on macbook with nvidia card, performance gets barely interactive beyond 100 subtractions/unions
   - with default `length` use
   - parameters : 32 iterations, near: 0., far:1000., 0,001 cut threshold
  - interestingly there barely seems to be a difference between 32 & 320 iterations or any other parameter change
  - gradient (normals) generation means calling the distance function 6 times in extra to the base computation
    - without normals , nice shading etc, performance is about 3 X better(no more interactive speeds beyond 300 boolean operations)


####Tooling, extra docs , links etc:
- all essentially based on : http://iquilezles.org/www/articles/distfunctions/distfunctions.htm
- for debuging perhaps use https://github.com/stackgl/glsl-transpiler to convert shader code to js
