import { flipVec3, flipVec3Abs } from './utils'
import { translation, union, intersection, difference, operationsHelper } from './operations'
import { cuboid, sphere, cylinder } from './primitives'

export function evaluateModule (module) {
  console.log('evaluateModule', module.name, module)

  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')

  /*
  if (module.name === 'rotate') {
    let rot = flipVec3Abs(module.argexpr[0].children)
    lines.push(`pos += rotateZ( rotateY( rotateX( pos, ${rot[0]}), ${rot[1]} ) ${rot[2]} );`)
  }*/


  const operations = {
    'union': union,
    'difference': difference,
    'intersection': intersection,

    'translate': translation,

    'cube': cuboid,
    'sphere': sphere,
    'cylinder': cylinder
  }

  const op = operations[module.name]

  if (op) {
    return op(module)
  } else {
    let {declarations, operands, allOps, unions} = operationsHelper(nonControlChildren, true)
    return [].concat(
      //declarations,
      //unions,
      [`return ${operands};`]
    ).join('\n')
  }
}
