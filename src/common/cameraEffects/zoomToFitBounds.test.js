import test from 'ava'
import zoomToFitBounds from './zoomToFitBounds'

test('zoomToFitBounds', t => {
  const input = {
  }

  const bounds = {
    dia: 5.745432971379113,
    center: [-5, -0.4000000059604645, 2.5],
    min: [-10, -2.8, 1],
    max: [0, 2, 4],
    size: [10, 4.8, 3]
  }

  const bounds = zoomToFitBounds(camera, bounds)

  t.deepEqual(bounds, expBounds)
})
