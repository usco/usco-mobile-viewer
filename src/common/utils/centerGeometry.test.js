import test from 'ava'
import centerGeometry from './centerGeometry'

test('centerGeometry (default params)', t => {

  const geometry = {positions: [1, -1, 6, -1, 6, 28], normals: [0, 2, 1]}
  const bounds = {min: [-5, 3, -1], max: [7, 5, 9]}
  const updatedGeometry = centerGeometry(geometry, bounds)
  const expUpdatedGeometry = {positions: [0, -5, 2, -2, 2, 24], normals: [0, 2, 1]}

  t.deepEqual(updatedGeometry, expUpdatedGeometry)
})

test('centerGeometry (x axis)', t => {

  const geometry = {positions: [1, -1, 6, -1, 6, 28], normals: [0, 2, 1]}
  const bounds = {min: [-5, 3, -1], max: [7, 5, 9]}
  const updatedGeometry = centerGeometry(geometry, bounds, [1, 0, 0])
  const expUpdatedGeometry = {positions: [0, -1, 6, -2, 6, 28], normals: [0, 2, 1]}

  t.deepEqual(updatedGeometry, expUpdatedGeometry)
})

test('centerGeometry (x & z axis)', t => {

  const geometry = {positions: [1, -1, 6, -1, 6, 28], normals: [0, 2, 1]}
  const bounds = {min: [-5, 3, -1], max: [7, 5, 9]}
  const updatedGeometry = centerGeometry(geometry, bounds, [1, 0, 1])
  const expUpdatedGeometry = {positions: [0, -1, 2, -2, 6, 24], normals: [0, 2, 1]}

  t.deepEqual(updatedGeometry, expUpdatedGeometry)
})
