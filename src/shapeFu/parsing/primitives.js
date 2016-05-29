


function cylinder(){
  if (module.name === 'cylinder') {
    // console.log('cylinder')
    const params = module.argnames.reduce(function (rs, argName, index) {
      rs[argName] = module.argexpr[index]
      return rs
    }, {})

    const r1 = params['r1'] ? params['r1'] : params['r']
    const r2 = params['r2'] ? params['r2'] : params['r']
    const h = params['h']

    return ` sdConeSection(pos, ${h}., ${r1}., ${r2}.);`
  // lines.push(`float result = opS(cu1, c1);`)
  }
}

function cuboid(){
  if (module.name === 'cube') {
    const params = module.argnames.reduce(function (rs, argName, index) {
      rs[argName] = module.argexpr[index]
      return rs
    }, {})

    let size = params['size'].children
    const center = params['center'] ? params['center'] : false
    let pos = [0, 0, 0]
    if (center) {
      pos = [-size[0] / 2, -size[1] / 2, -size[2] / 2]
    }

    vecToStr(size)

    // to string
    pos = flipVec3(pos)
    size = flipVec3Abs(size)

    // console.log('cube', params, size, center, module)
    return ` sdBox(pos + ${vecToStr(pos)}, ${vecToStr(size)});`
  }
}
