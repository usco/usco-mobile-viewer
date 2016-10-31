import test from 'ava'
import isObjectOutsideBounds from './isObjectOutsideBounds'


test('isObjectOutsideBounds', t => {
  const entity = {
    transforms: {
      pos: [0, -2.3, 71]
    },
    bounds: {
      min: [-7, 0, -1.7],
      max: [32, 0.8, 8.2]
    }
  }

  const machineParams = {
    machine_volume: [100, 150, 220],
    printable_area: [180, 200]
  }

  const outOfBounds = isObjectOutsideBounds(machineParams, entity)

  t.deepEqual(outOfBounds, false)
})

test('isObjectOutsideBounds( is out of bounds)', t => {
  const entity = {
    transforms: {
      pos: [20, -2.3, 71]
    },
    bounds: {
      min: [-7, 0, -1.7],
      max: [74, 0.8, 8.2]
    }
  }

  const machineParams = {
    machine_volume: [50, 50, 50],
    printable_area: [180, 200]
  }

  const outOfBounds = isObjectOutsideBounds(machineParams, entity)

  t.deepEqual(outOfBounds, true)
})

test('isObjectOutsideBounds(tall object)', t => {
  const entity = {
    transforms: {
      pos: [0, 0.3, 0]
    },
    bounds: {
      min: [-20, -10, 0],
      max: [20, 10, 250]
    }
  }

  const machineParams = {
    machine_volume: [250, 250, 250],
    printable_area: [180, 200]
  }

  const outOfBounds = isObjectOutsideBounds(machineParams, entity)

  t.deepEqual(outOfBounds, true)
})
