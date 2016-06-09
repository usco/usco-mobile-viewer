import mat4 from 'gl-mat4'

export default function centerGeometry(geometry, boundingBox){
  const translation = [
    -0.5 * (boundingBox[0][0] + boundingBox[1][0]),
    -0.5 * (boundingBox[0][1] + boundingBox[1][1]),
    -0.5 * (boundingBox[0][2] + boundingBox[1][2])
  ]
  let translate = mat4.create()
  translate = mat4.translate(translate, translate, translation)

  //taken almost verbatim from https://github.com/wwwtyro/geo-3d-transform-mat4/blob/master/index.js
  function transform(positions){
    for (var i = 0; i < positions.length; i+=3) {
        vec3.transformMat4(newpos[i], newpos[i], m)
    }
    /*var oldfmt = geoid.identify(positions)
     var newpos = geoconv.convert(positions, geoid.ARRAY_OF_ARRAYS, 3)
     for (var i = 0; i < newpos.length; i++) {
         vec3.transformMat4(newpos[i], newpos[i], m)
     }
     newpos = geoconv.convert(newpos, oldfmt, 3)
     return newpos*/
  }

  const centered = transform(geometry.positions, translate)
  return centered
}
