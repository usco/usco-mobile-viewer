export default function getBrandingSvgGeometry (machineName) {
  // the geometry in the imported js files was generated using the svgStringAsGeometry tool + some formating
  // static file size is larger than in the origin svg files, but is faster to load & has better quality
  const brandingSvgs = {
    'ultimaker3': require('./um3LogoGeo.js'),
    'ultimaker3_extended': require('./um3ExtLogoGeo.js')
  }
  return brandingSvgs[machineName]
}
