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
    machine_disallowed_areas: [
      [[-91.5, -115], [-115, -115], [-115, -104.6], [-91.5, -104.6]],
      [[-99.5, -104.6], [-115, -104.6], [-115, 104.6], [-99.5, 104.6]],
      [[-94.5, 104.6], [-115, 104.6], [-115, 105.5], [-94.5, 105.5]],
      [[-91.4, 105.5], [-115, 105.5], [-115, 115], [-91.4, 115]]
    ],
    machine_head_with_fans_polygon: [
      [ -20, 10 ],
      [ -20, -10 ],
      [ 50, 10 ],
      [ 50, -10 ]
    ]
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
    machine_disallowed_areas: [
      [[-91.5, -115], [-115, -115], [-115, -104.6], [-91.5, -104.6]],
      [[-99.5, -104.6], [-115, -104.6], [-115, 104.6], [-99.5, 104.6]],
      [[-94.5, 104.6], [-115, 104.6], [-115, 105.5], [-94.5, 105.5]],
      [[-91.4, 105.5], [-115, 105.5], [-115, 115], [-91.4, 115]]
    ],
    machine_head_with_fans_polygon: [
      [ -20, 10 ],
      [ -20, -10 ],
      [ 50, 10 ],
      [ 50, -10 ]
    ]
  }

  const outOfBounds = isObjectOutsideBounds(machineParams, entity)

  t.deepEqual(outOfBounds, true)
})
