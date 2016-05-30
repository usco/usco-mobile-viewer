import { evaluateModule } from './evaluators'

export function union (module) {
  console.log('union')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren)


  const opResult = [].concat(
    declarations,
    unions,
    [`return opU(${allOps[0].opName}, ${operands} );`]
  ).join('\n')

  console.log('opResult', opResult)
  return opResult
}

export function difference (module) {
  console.log('difference')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren)


  const opResult = [].concat(
    declarations,
    unions,
    [`return opS(${allOps[0].opName}, ${operands} );`]
  ).join('\n')

  console.log('opResult', opResult)
  return opResult
}

export function intersection (module) {
  console.log('intersection')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren)

  const opResult = [].concat(
    declarations,
    unions,
    [`return opI(${allOps[0].opName}, ${operands} );`]
  ).join('\n')

  console.log('opResult', opResult)
  return opResult
}

/* creates a set of intermediary unions when needed*/
export function operationsHelper (children) {
  const allOps = children
    .map(function (child, index) {
      const opName = `_op0${index}`
      const opValue = `float ${opName} =` + evaluateModule(child)
      return {opName, opValue}
    })
  // build intermediary unions
  let prev
  let unions = []
  for (let i = 1;i < allOps.length;i++) {
    let cur = allOps[i]
    let resName = `_op${i - i}_op${i}`
    if (prev) {
      unions.push({opName: resName, opValue: `float ${resName} = opU(${cur.opName},${prev.opName});`})
      prev = {opName: resName}
    } else {
      prev = cur
    }
  }

  const declarations = allOps.map(op => op.opValue)
  const finalUnions = unions.map(op => op.opValue)
  const secondOp = allOps.length > 1 ? allOps[1].opName : ''
  const operands = unions.length > 0 ? unions[unions.length - 1].opName : secondOp

  console.log('declarations', declarations)
  console.log('unions', unions)
  console.log('operands', operands)
  return {declarations, unions: finalUnions, allOps, operands}
}
