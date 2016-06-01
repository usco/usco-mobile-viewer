export function flipVec3 (original, asString = false) { // convert openscad z up to shapeFu inverted y up
  if (asString) {
    return [original[0], `-${original[2]}`, `${original[1]}`]
  }
  return [original[0], original[2], original[1]]
}

export function flipVec3Abs (original) { // convert openscad z up to shapeFu inverted y up, not negated
  return [original[0], original[2], original[1]]
}

export function vecToStr (original) {
  return (`vec${original.length}(${original.join(',')})`)
}

export function forceDecimal (original) {
  return Number(Math.round('' + original + 'e2') + 'e-2').toFixed(2) // find something more efficient
}

export function getNonControlChildren (node) {
  return node.children ? node.children.filter(child => child && child.name !== 'echo') : []
}
