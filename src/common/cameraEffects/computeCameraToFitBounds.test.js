import test from 'ava'
import computeCameraToFitBounds from './computeCameraToFitBounds'
import vec3 from 'gl-vec3'

test('computeCameraToFitBounds', t => {
  const camera = {
    position: [0, 7, 2],
    target: [-5, 2.5, 7],
    fov: Math.PI / 4,
    aspect: 1
  }
  const bounds = {
    dia: 5,
    center: [5, 0, 2.5],
    size: [10, 4.8, 5]
  }
  const transforms = {
    pos: [12, 0, -7.1]
  }
  const idealCameraData = computeCameraToFitBounds({camera, bounds, transforms})
  const expIdealCameraData = {
    position: [28.691452026367188, 10.522306442260742, -16.291452407836914],
    target: [17, 0, -4.599999904632568]
  }

  t.deepEqual(idealCameraData, expIdealCameraData)
})
