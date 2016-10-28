const camera = {
  projection: new Float32Array(16),
  view: new Float32Array(16),

  thetaDelta: 0,
  phiDelta: 0,
  scale: 1,

  position: [150, 250, 200],
  target: [0, 0, 0]
}
export default camera
