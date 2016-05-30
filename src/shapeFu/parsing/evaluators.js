import { flipVec3, flipVec3Abs } from './utils'
import { union, intersection, difference, operationsHelper } from './operations'
import { cylinder, cuboid } from './primitives'

export function evaluateModule (module) {
  let lines = []
  console.log('evaluateModule', module.name, module)

  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')

  if (module.name === 'cylinder') {
    lines.push(cylinder(module))
  }

  if (module.name === 'cube') {
    lines.push(cuboid(module))
  }

  if (module.name === 'translate') {
    // console.log(module.argnames, module.argexpr)
    let pos = flipVec3(module.argexpr[0].children)
    lines.push(`pos += vec3(${pos});`)
  }

  if (module.name === 'rotate') {
    let rot = flipVec3Abs(module.argexpr[0].children)
    lines.push(`pos += rotateZ( rotateY( rotateX( pos, ${rot[0]}), ${rot[1]} ) ${rot[2]} );`)
  }

  const operations = {
    'union': union,
    'difference': difference,
    'intersection': intersection
  }

  const op = operations[module.name]

  if (op) {
    return op(module)
  } else {
    nonControlChildren.forEach(function (child) {
      // console.log('child module', child)
      lines.push(evaluateModule(child))
    })
  }
  return lines.join('\n')
}
