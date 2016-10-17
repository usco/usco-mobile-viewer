const camera = {
  projection: new Float32Array(16),
  view: new Float32Array(16),

  thetaDelta: 0,
  phiDelta: 0,
  scale: 1,

  position: [450, 300, 200],
  target: [0, 0, 0]
}

// below this, dynamic stuff mostly, since this is also the ouput of the controls function
/*camera: {

  //view: mat4.create() // default, this is just a 4x4 matrix
}*/

export default camera
