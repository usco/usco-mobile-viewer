import { flipVec3, flipVec3Abs, forceDecimal } from './utils'
import { translation, union, intersection, difference, operationsHelper } from './operations'
import { cuboid, sphere, cylinder } from './primitives'

function bool (node) {
  return node.value
}
function number (node) {
  console.log('number', node)
  return forceDecimal(node.value)
}

function invert (node) {
  console.log('INVERT', node)
  return - evaluateModule(node.children[0])
}

function vector (node) {
  console.log('VECTOR', node)
  const result = node.children.map(evaluateModule)
  return result
}

export function evaluateModule (module, parent) {
  console.log('evaluateModule', module.name, module, parent)

  const nonControlChildren = module.children ? module.children.filter(child => child && child.name !== 'echo') : []

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
    'cylinder': cylinder,

    'NUM': number,
    'BOOL': bool,
    'I': invert,
    'V': vector
  }

  const op = operations[module.name || module.type]

  if (op) {
    return op(module, parent)
  } else {
    let {declarations, operands} = operationsHelper(nonControlChildren, true, module)
    return [].concat(
      // declarations,
      [`return ${operands};`]
    ).join('\n')
  }
}
