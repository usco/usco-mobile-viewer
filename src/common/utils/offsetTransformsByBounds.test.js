import test from 'ava'
import offsetTransformsByBounds from './offsetTransformsByBounds'

test('offsetTransformsByBounds (default params (z axis))', t => {

  const transforms = {pos: [10, 15, -7], rot: [0, 0, 1], sca: [1, 1, 1]}
  const bounds = {min: [-1, 0, 20], max: [7, 0, -10]}
  const updatedTransforms = offsetTransformsByBounds(transforms, bounds)
  const expUpdatedTransforms = {pos: [10, 15, -22], rot: [0, 0, 1], sca: [1, 1, 1]}

  t.deepEqual(updatedTransforms, expUpdatedTransforms)
})

test('offsetTransformsByBounds (x axis)', t => {

  const transforms = {pos: [10, 15, -7], rot: [0, 0, 1], sca: [1, 1, 1]}
  const bounds = {min: [-1, 0, 20], max: [7, 0, -10]}
  const updatedTransforms = offsetTransformsByBounds(transforms, bounds, [1, 0, 0])
  const expUpdatedTransforms = {pos: [14, 15, -7], rot: [0, 0, 1], sca: [1, 1, 1]}

  t.deepEqual(updatedTransforms, expUpdatedTransforms)
})

test('offsetTransformsByBounds (y axis)', t => {

  const transforms = {pos: [10, 15, -7], rot: [0, 0, 1], sca: [1, 1, 1]}
  const bounds = {min: [-1, 6.21, 20], max: [7, -19, -10]}
  const updatedTransforms = offsetTransformsByBounds(transforms, bounds, [0, 1, 0])
  const expUpdatedTransforms = {pos: [10, 2.3949999999999996, -7], rot: [0, 0, 1], sca: [1, 1, 1]}

  t.deepEqual(updatedTransforms, expUpdatedTransforms)
})
