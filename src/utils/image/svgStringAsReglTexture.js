export default function svgStringAsReglTexture (regl, svgString, scale) {
  const svgData = 'data:image/svg+xml;base64,' + btoa(svgString)
  const svgFinal = new Image()

  const texture = regl.texture()

  svgFinal.onload = function (e) {
    console.log('here',e.target.width*0.2, e.target.height*0.2)
    texture({data: e.target})
  }
  svgFinal.setAttribute('src', svgData)
  return texture// ,  mag: 'linear', min: 'nearest'})
}
