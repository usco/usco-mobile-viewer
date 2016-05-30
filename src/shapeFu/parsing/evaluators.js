import { flipVec3 } from './utils'
import { difference } from './operations'
import { cylinder, cuboid } from './primitives'

export function evaluateModule (module) {
  let lines = []
  // console.log('evaluateModule', module.name, module)

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

  if (module.name === 'difference') {
    return difference(module)
  } else {
    nonControlChildren.forEach(function (child) {
      // console.log('child module', child)
      lines.push(evaluateModule(child))
    })
  }

  return lines.join('\n')
}
