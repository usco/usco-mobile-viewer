import test from 'ava'
import zoomInOn from './zoomInOn'
import zoomToFitBounds from './zoomToFitBounds'

//TODO : fix implementation
/*
test('zoomInOn', t => {

  const options = {}
  const camera = {
    position: [0, 7, 2],
    target: [-5, 2.5, 7]
  }
  const targetObject = {
    bounds: {
      dia: 5,
      center: [-5, 0, 2.5],
      min: [-10, -2.8, 1],
      max: [0, 2, 4]
    },
    transforms: {
      pos: [0, 5, 2]
    }
  }

  const updatedCameraData = zoomInOn(options, camera, targetObject)
  const expUpdatedCameraData = {

  }

  t.deepEqual(updatedCameraData, expUpdatedCameraData)
})*/

test('zoomToFitBounds', t => {
  const camera = {
    position: [0, 7, 2],
    target: [-5, 2.5, 7]
  }
  const bounds = {
    dia: 5,
    center: [-5, 0, 2.5],
    min: [-10, -2.8, 1],
    max: [0, 2, 4]
  }
  const updatedCameraData = zoomToFitBounds(camera, bounds)
  const expUpdatedCameraData = {
    camera: {
      position: new Float32Array([0, -3.005925178527832, -5.410665035247803]),
      target: new Float32Array([0, 0, 0])
    }
  }

  t.deepEqual(updatedCameraData, expUpdatedCameraData)
})
