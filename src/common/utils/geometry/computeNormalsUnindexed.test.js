import test from 'ava'
import computeNormalsFromUnindexedPositions from './computeNormalsFromUnindexedPositions'


//FIXME !!! the computed normals are off !!! have double checked and I am not certain
test('compute normals from unindexed positions', t => {

  const positions = [0.2, -1, 7, 6, 4, -2.3, -1, 7, 6]
  const normals = [...computeNormalsFromUnindexedPositions(positions)] // convert from typed array to simple array
  const expNormals = [0.7939755320549011, -0.604062020778656, -0.06864339858293533, 0.7939755320549011, -0.604062020778656, -0.06864339858293533, 0.7939755320549011, -0.604062020778656, -0.06864339858293533]

  t.deepEqual(normals, expNormals)
})
