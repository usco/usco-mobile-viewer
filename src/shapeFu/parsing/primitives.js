import { flipVec3, flipVec3Abs, vecToStr, forceDecimal } from './utils'

export function cylinder (module, context) {
  console.log('cylinder', module, context)
  const params = module.argnames.reduce(function (rs, argName, index) {
    rs[argName] = module.argexpr[index]
    return rs
  }, {})
  const transforms = context.transforms || 'pos'

  const r1 = (params['r1'] ? params['r1'] : params['r']) * 2
  const r2 = (params['r2'] ? params['r2'] : params['r']) * 2
  const h = forceDecimal(parseFloat(params['h']) + 0.1)
  const res = params['$fn'] ? parseInt(params['$fn']) : undefined
  const center = params['center'] ? params['center'] : false
  let pos = !center ? [0, -h, 0] : [0, 0, 0] // [-size[0] / 2, -size[1] / 2, -size[2] / 2]

  if (!res || res && res > 100) {
    return ` sdConeSection( ${transforms} + ${vecToStr(pos)} , ${h}, ${forceDecimal(r1)}, ${forceDecimal(r2)})`
  }
  if (res && res < 100) { // TODO: how to make generic ??
    return ` sdHexPrism(opRotY(${transforms} + ${vecToStr(pos)}, PI), ${h} ,${forceDecimal(r1)})`
  }
}

export function cuboid (module, context) {
  console.log('cuboid', module, context)
  const params = module.argnames.reduce(function (rs, argName, index) {
    rs[argName] = module.argexpr[index]
    return rs
  }, {})
  const transforms = context.transforms || 'pos'

  let size = params['size'].children
  const center = params['center'] ? params['center'] : false
  let pos = !center ? [size[0], -size[1], size[2]] : [0, 0, 0] // [-size[0] / 2, -size[1] / 2, -size[2] / 2]

  // to string
  pos = flipVec3(pos)
  size = flipVec3Abs(size)

  return ` sdBox(${transforms} + ${vecToStr(pos)}, ${vecToStr(size)})`
}

export function sphere (module, context) {
  console.log('sphere', module)
  const params = module.argnames.reduce(function (rs, argName, index) {
    rs[argName] = module.argexpr[index]
    return rs
  }, {})
  const transforms = context.transforms || 'pos'

  const r = params['r'] ? params['r'] : 1
  const center = params['center'] ? params['center'] : false
  // let pos = !center ? [size[0], -size[1], size[2]] : [0, 0, 0] // [-size[0] / 2, -size[1] / 2, -size[2] / 2]
  // pos = flipVec3(pos)

  return ` sdSphere(${transforms}, ${r})`
}
