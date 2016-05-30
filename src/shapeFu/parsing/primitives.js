import { flipVec3, flipVec3Abs, vecToStr, forceDecimal } from './utils'

export function cylinder (module) {
  console.log('cylinder', module)
  const params = module.argnames.reduce(function (rs, argName, index) {
    rs[argName] = module.argexpr[index]
    return rs
  }, {})

  const r1 = (params['r1'] ? params['r1'] : params['r']) * 2
  const r2 = (params['r2'] ? params['r2'] : params['r']) * 2
  const h = forceDecimal(parseFloat(params['h']) + 0.1)
  const res = params['$fn'] ? parseInt(params['$fn']) : undefined
  const center = params['center'] ? params['center'] : false
  let pos = !center ? [0, -h, 0] : [0, 0, 0] // [-size[0] / 2, -size[1] / 2, -size[2] / 2]

  if (!res || res && res > 100) {
    return ` sdConeSection( pos+ ${vecToStr(pos)} , ${h}, ${forceDecimal(r1)}, ${forceDecimal(r2)})`
  }
  if (res && res < 100) { // TODO: how to make generic ??
    return ` sdHexPrism(opRotY(pos + ${vecToStr(pos)}, PI), ${h} ,${forceDecimal(r1)})`
  }
}

export function cuboid (module) {
  console.log('cuboid', module)
  const params = module.argnames.reduce(function (rs, argName, index) {
    rs[argName] = module.argexpr[index]
    return rs
  }, {})

  let size = params['size'].children
  const center = params['center'] ? params['center'] : false
  let pos = !center ? [size[0], -size[1], size[2]] : [0, 0, 0] // [-size[0] / 2, -size[1] / 2, -size[2] / 2]

  // to string
  pos = flipVec3(pos)
  size = flipVec3Abs(size)

  return ` sdBox(pos + ${vecToStr(pos)}, ${vecToStr(size)})`
}

export function sphere (module) {
  console.log('sphere', module)
  const params = module.argnames.reduce(function (rs, argName, index) {
    rs[argName] = module.argexpr[index]
    return rs
  }, {})

  const r = params['r'] ? params['r'] : 1
  const center = params['center'] ? params['center'] : false
  // let pos = !center ? [size[0], -size[1], size[2]] : [0, 0, 0] // [-size[0] / 2, -size[1] / 2, -size[2] / 2]
  // pos = flipVec3(pos)

  return ` sdSphere(pos, ${r})`
}

/*  if (module.name === 'cube') {
    const params = module.argnames.reduce(function (rs, argName, index) {
      rs[argName] = module.argexpr[index]
      return rs
    }, {})

    let size = params['size'].children
    const center = params['center'] ? params['center'] : false
    let pos = [0, 0, 0]
    if (!center) {
      pos = [size[0] / 2, size[1] / 2, size[2] / 2]
    }

    vecToStr(size)

    // to string
    pos = flipVec3(pos)
    size = flipVec3Abs(size)

    const res = ` sdBox(pos + ${vecToStr(pos)}, ${vecToStr(size)});`
    console.log('cube', params, size, center, module)
    lines.push(res)
  }*/
