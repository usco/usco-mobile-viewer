import { svgStringAsGeometry } from 'usco-geometry-utils'
import getBrandingSvg from './getBrandingSvg'
import fs from 'fs'
import path from 'path'

const machineNames = ['ultimaker3', 'ultimaker3_extended']
const shortNames = {'ultimaker3': 'um3', 'ultimaker3_extended': 'um3Ext'}

machineNames.forEach(function (machineName) {
  const svg = getBrandingSvg(machineName)
  const geometry = svgStringAsGeometry(svg, {delaunay: true, scale: 100, randomization: 50, simplify: 0.05 })

  const output = `exports.positions = ${JSON.stringify(geometry.positions)}
exports.cells = ${JSON.stringify(geometry.cells)}`

  const shortName = shortNames[machineName]
  fs.writeFileSync(path.resolve(__dirname, `${shortName}LogoGeo.js`), output)
})
