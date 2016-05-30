import { evaluateModule } from './evaluators'
import {flipVec3} from './utils'

export function translation (module) {
  console.log('translate')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren)

  const pos = flipVec3(module.argexpr[0].children)

  const opResult = [` pos += vec3(${pos}); ${declarations} )`].join('\n')

   //[` opS(${allOps[0].opValue}, ${operands})`].join('\n')

  // console.log(module.argnames, module.argexpr)
  console.log('opResult', opResult)
  return opResult
}

export function union (module) {
  console.log('union')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren)

  const opResult = [` opU(${allOps[0].opValue}, ${operands})`].join('\n')

  console.log('opResult', opResult)
  return opResult
}

export function difference (module) {
  console.log('difference')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren)

  const opResult = [` opS(${allOps[0].opValue}, ${operands} )`].join('\n')

  console.log('opResult', opResult)
  return opResult
}

export function intersection (module) {
  console.log('intersection')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')
  let {declarations, unions, operands, allOps} = operationsHelper(nonControlChildren)

  const opResult = [` opI(${allOps[0].opValue}, ${operands} )`].join('\n')


  console.log('opResult', opResult)
  return opResult
}

/* creates a set of intermediary unions when needed*/
export function operationsHelper (children, includeFirst = false) {
  const allOps = children
    .map(function (child, index) {
      const opName = `_op0${index}`
      const opValue = `` + evaluateModule(child)//float ${opName} =
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
      unions.push({opName: resName, opValue: ` opU(${cur.opValue},${prev.opValue})`})// `float ${resName} = opU(${cur.opName},${prev.opName});`})
      unionedResult= ` opU(${cur.opValue},${unionedResult})`
      prev = {opName: resName}
    } else {
      prev = cur
      unionedResult = cur.opValue
    }
  }

  const declarations = allOps.map(op => op.opValue)
  const finalUnions = unions.map(op => op.opValue)
  const secondOp = allOps.length > start ? allOps[start].opValue : '' // opName
  const operands = unions.length > 0 ? unionedResult : secondOp //opName
  //const operands2 = // unions.length > 0 ? unions[unions.length - 1].opName : secondOp //opName

  console.log('declarations', declarations)
  console.log('unions', unions)
  console.log('operands', operands)
  return {declarations, unions: finalUnions, allOps, operands}
}
