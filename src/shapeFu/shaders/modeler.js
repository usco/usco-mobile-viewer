
function cube(size){
	// object 1 : cube
	return `float d1 = dist_box( pos, vec3( ${size} ) );`
}

function sphere(radius){
  return `float d0 = dist_sphere( pos, ${radius} );`
}

export function makeAssembly(){
  let result = `
    ${cube(1)}
    ${sphere(2.5)}
  `
  return result
}

/*
  source => transform (glsl)=> display
  source => convert to mesh => display
*/
