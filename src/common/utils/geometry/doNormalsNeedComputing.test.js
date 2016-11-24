import test from 'ava'
import doNormalsNeedComputing from './doNormalsNeedComputing'

test('doNormalsNeedComputing : no normals', t => {
  const geometry = {positions: [0, 1, 2, 3, 4, 5]}
  const result = doNormalsNeedComputing(geometry)
  const expResult = true
  t.deepEqual(result, expResult)
})

test('doNormalsNeedComputing : ok normals', t => {
  const geometry = {positions: [0, 1, 2, 3, 4, 5], normals: [1, 1, -1, 1, 1, 1]}
  const result = doNormalsNeedComputing(geometry)
  const expResult = false
  t.deepEqual(result, expResult)
})

test('doNormalsNeedComputing : wrong normals', t => {
  const geometry = {positions: [0, 1, 2, 3, 4, 5], normals: [0, 0, 0, 0, 0, 0, 0]}
  const result = doNormalsNeedComputing(geometry)
  const expResult = true
  t.deepEqual(result, expResult)
})


test('doNormalsNeedComputing : wrong normals, custom testLength', t => {
  const geometry = {positions: [0, 1, 2, 3, 4, 5], normals: [0, 0, 0, 1, 0, 0, 0]}
  const result = doNormalsNeedComputing(geometry, 4)
  const expResult = false
  t.deepEqual(result, expResult)
})
