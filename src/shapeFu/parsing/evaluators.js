import { flipVec3, flipVec3Abs, forceDecimal } from './utils'
import { translation, rotation, union, intersection, difference, operationsHelper } from './operations'
import { cuboid, sphere, cylinder } from './primitives'

function bool (node) {
  return node.value
}

function number (node) {
  console.log('number', node)
  return forceDecimal(node.value)
}

function vector (node) {
  console.log('VECTOR', node)
  const result = node.children.map(evaluateExpression)
  return result
}

function invert (node) {
  console.log('INVERT', node)
  return - evaluateModule(node.children[0])
}

function add (node) {
  console.log('addition', node)
  const left = evaluateExpression(node.children[0])
  const right = evaluateExpression(node.children[1])

  const result = typeof left === 'string' ? `${left}+${right}` : left + right
  return result
}

function sub (node) {
  console.log('subtraction', node)
  const left = evaluateExpression(node.children[0])
  const right = evaluateExpression(node.children[1])

  const result = typeof left === 'string' ? `${left}-${right}` : left - right
  return result
}

function mul (node) {
  console.log('multiplication', node)
  const left = evaluateExpression(node.children[0])
  const right = evaluateExpression(node.children[1])

  const result = typeof left === 'string' ? `${left}*${right}` : left * right
  return result
}

function div (node) {
  console.log('division', node)
  const left = evaluateExpression(node.children[0])
  const right = evaluateExpression(node.children[1])

  const result = typeof left === 'string' ? `${left}/${right}` : left / right
  return result
}

function selfAssign (node) {
  return node.var_name
}

export function evaluateExpression (expr) {
  const ops = {
    'NUM': number,
    'BOOL': bool,
    'I': invert,
    'V': vector,

    '+': add,
    '-': sub,
    '*': mul,
    '/': div,

    'L': selfAssign
  }

  const op = ops[expr.type]

  return op(expr)
}

function evaluateVariables (module) {
  // const variablesCache = {}
  if(!module.variables){
    return []
  }
  const variables = module.variables.map(function ({left, right}) {
    const value = evaluateExpression(right)
    const assignment = `float ${left} = ${value};`

    return {assignment, value}
  })

  // console.log('results', variables)
  return variables
}

export function evaluateModule (module, parent) {
  console.log('evaluateModule', module.name, module, parent)

  const nonControlChildren = module.children ? module.children.filter(child => child && child.name !== 'echo') : []

  const variables = evaluateVariables(module)
  const assignments = variables.map(a => a.assignment).join('\n')

  const operations = {
    'union': union,
    'difference': difference,
    'intersection': intersection,

    'translate': translation,
    'rotation': rotation,

    'cube': cuboid,
    'sphere': sphere,
    'cylinder': cylinder,

    'NUM': number,
    'BOOL': bool,
    'I': invert,
    'V': vector,
    '+': add,
    '-': sub,
    '*': mul,
    '/': div,

    'L': selfAssign
  }

  const op = operations[module.name || module.type]

  if (op) {
    return op(module, parent)
  } else {
    let {declarations, operands} = operationsHelper(nonControlChildren, true, module)
    return [].concat(
      // declarations,
      assignments,
      [`return ${operands};`]
    ).join('\n')
  }
}
