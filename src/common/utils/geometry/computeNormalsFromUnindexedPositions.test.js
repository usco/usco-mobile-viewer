import test from 'ava'
import computeNormalsFromUnindexedPositions from './computeNormalsFromUnindexedPositions'

test('compute normals from unindexed positions', t => {
  const positions = [0.2, -1, 7, 6, 4, -2.3, -1, 7, 6]
  const normals = [...computeNormalsFromUnindexedPositions(positions)] // convert from typed array to simple array
  const expNormals = [0.7833055853843689, 0.19142454862594604, 0.591429591178894, 0.7833055853843689, 0.19142454862594604, 0.591429591178894, 0.7833055853843689, 0.19142454862594604, 0.591429591178894]

  t.deepEqual(normals, expNormals)
})
