import svgMesh3d from 'svg-mesh-3d'
var parsePath = require('extract-svg-path').parse

export default function svgStringAsGeometry (svgString) {
  const svgPath = parsePath(svgString)
  const logoMesh = svgMesh3d(svgPath, {
    delaunay: true,
    scale: 1
  })
  return logoMesh
}
