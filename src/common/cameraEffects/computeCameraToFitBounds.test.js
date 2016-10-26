import test from 'ava'
import computeCameraToFitBounds from './computeCameraToFitBounds'
import vec3 from 'gl-vec3'

test('computeCameraToFitBounds', t => {
  const camera = {
    position: [0, 7, 2],
    target: [-5, 2.5, 7]
  }
  const bounds = {
    dia: 5,
    center: [-5, 0, 2.5],
    min: [-10, -2.8, 1],
    max: [0, 2, 4],
    size: [10, 4.8, 5]
  }
  const updatedCameraData = computeCameraToFitBounds(camera, bounds)
  const expUpdatedCameraData = {
    camera: {
      position: new Float32Array([0, -3.005925178527832, -5.410665035247803]),
      target: new Float32Array([0, 0, 0])
    }
  }

  console.log(updatedCameraData)

  t.deepEqual(updatedCameraData, expUpdatedCameraData)
})
