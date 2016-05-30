import { evaluateModule } from './evaluators'
import { flipVec3 } from './utils'

export function translation (module, context) {
  console.log('translate', module)
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')

  const pos = flipVec3(module.argexpr[0].children)

  //module.transforms ? module.transforms.push(`opT(pos, ${pos})`) : [] // yeeeek !! we mutate the data so all children have an updated position to deal with
  const transforms = context.transforms? `opT(${context.transforms}, vec3(${pos}))` : `opT(pos, vec3(${pos}))`
  context = Object.assign(context,{transforms}) // assig

  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren, true, context)

  // pos += vec3(${pos})
  const opResult = [`${operands}`].join('\n')
  // console.log(module.argnames, module.argexpr)
  console.log('opResult', opResult)
  return opResult
}

export function union (module) {
  console.log('union')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren, false, module)

  const opResult = [` opU(${allOps[0].opValue}, ${operands})`].join('\n')

  console.log('opResult', opResult)
  return opResult
}

export function difference (module, parent) {
  console.log('difference')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren, false, module)

  const opResult = [` opS(${allOps[0].opValue}, ${operands} )`].join('\n')

  console.log('opResult', opResult)
  return opResult
}

export function intersection (module, parent) {
  console.log('intersection')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren, false, module)

  const opResult = [` opI(${allOps[0].opValue}, ${operands} )`].join('\n')

  console.log('opResult', opResult)
  return opResult
}

/* creates a set of intermediary unions when needed*/
export function operationsHelper (children, includeFirst = false, parent) {
  const allOps = children
    .map(function (child, index) {
      const opName = `_op0${index}`
      const opValue = `` + evaluateModule(child, parent) // float ${opName} =
      return {opName, opValue}
    })
  // build intermediary unions
  let prev
  let unions = []
  let unionedResult = ''
  const start = includeFirst ? 0 : 1
  for (let i = start;i < allOps.length;i++) {
    let cur = allOps[i]
    let resName = `_op${i - i}_op${i}`
    if (prev) {
      unions.push({opName: resName, opValue: ` opU(${cur.opValue},${prev.opValue})`}) // `float ${resName} = opU(${cur.opName},${prev.opName});`})
      unionedResult = ` opU(${cur.opValue},${unionedResult})`
      prev = {opName: resName}
    } else {
      prev = cur
      unionedResult = cur.opValue
    }
  }

  const declarations = allOps.map(op => op.opValue)
  const finalUnions = unions.map(op => op.opValue)
  const secondOp = allOps.length > start ? allOps[start].opValue : '' // opName
  const operands = unions.length > 0 ? unionedResult : secondOp // opName

  //console.log('declarations', declarations)
  //console.log('unions', unions)
  //console.log('operands', operands)
  return {declarations, unions: finalUnions, allOps, operands}
}
