/*
// this is slow, see batches example above for really speedy batching
for(var i=0;i<20;i++){
  const bunnyDataT = {
    geometry: bunny,
    transforms: {
      pos: [i*2+2, 0, -5],
      rot: [0, 0, 0],
      sca: [-1, 1, -1]
    },
    color
  }
  drawModel(bunnyDataT)
}
//use this within regl calling
//test for batches : this is far
let batches = []
for(var i=0;i<100;i++){
  let modelMat = mat4.identity([])
  mat4.translate(modelMat, modelMat, [pos[0]+i*2+2, pos[2], pos[1]])//z up
  mat4.scale(modelMat, modelMat, [sca[0], sca[2], sca[1]])

  batches.push({pos, color, mat: modelMat})
}
return regl(params)(batches)
*/
