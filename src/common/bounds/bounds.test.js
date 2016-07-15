import test from 'ava'
import computeBounds from './computeBounds'

test('computeBounds', t => {
  const input = {
    geometry: {
      positions: [0, 2, 1, -10, 2, 1, -2.4, -2.8, 4]
    }
  }

  const expBounds = {
    dia: 5.745432971379113,
    center: [-5, -0.4000000059604645, 2.5],
    min: [-10, -2.8, 1],
    max: [0, 2, 4]
  }

  const bounds = computeBounds(input)

  t.deepEqual(bounds, expBounds)
})
