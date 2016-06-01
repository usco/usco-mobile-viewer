import { forceDecimal } from './utils'
import { translation, rotation, union, intersection, difference, operationsHelper, makeUnions } from './operations'
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
  return  `- ${evaluateExpression(node.children[0])}`
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

function loop (node, context) {
  console.log('loop', node)

  const nonControlChildren = node.children ? node.children.filter(child => child && child.name !== 'echo') : []

  context = Object.assign({},context)
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren, true, context)

  //evaluateExpression()
  const varName = node.argnames[0]
  const items = node.argexpr.map(evaluateExpression)[0]
  //const result = `for(int ${varName} = 0; j < noOfLightSources; j++){`
  //const itermed = node.children.map(evaluateModule)

  const foo = items.map(function(cur, index){
    //const opValue =  `flot a = ${cur};\n ${operands}\n`
    return {opValue, opName:''}
  })


  const bar = makeUnions(foo)
  /*for(int j = 0; j < noOfLightSources; j++)
  {

  }*/

  return foo.join('\n')
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
  if (!module.variables) {
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

export function evaluateModule (module, context) {
  context = context || {}
  console.log('evaluateModule', module.name, module, context)

  const nonControlChildren = module.children ? module.children.filter(child => child && child.name !== 'echo') : []

  const variables = evaluateVariables(module)
  const assignments = variables.map(a => a.assignment).join('\n')

  const operations = {
    'union': union,
    'difference': difference,
    'intersection': intersection,

    'translate': translation,
    'rotate': rotation,

    'cube': cuboid,
    'sphere': sphere,
    'cylinder': cylinder,

    'for': loop,

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
    return op(module, context)
  } else {
    let {declarations, operands} = operationsHelper(nonControlChildren, true, context)
    return [].concat(
      // declarations,
      assignments,
      [`return ${operands};`]
    ).join('\n')
  }
}
