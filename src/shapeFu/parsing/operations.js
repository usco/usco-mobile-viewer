import {evaluateModule} from './evaluators'

export function difference(module){
  console.log('difference')
  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')

  let base = []
  let operandNames = []
  let operands = []

  const firstOp = `float _op0 = ${evaluateModule(nonControlChildren[0])}`
  const otherOps = nonControlChildren.slice(1)
    .map(function (child, index) {
      const opName = `foo${index}`
      operandNames.push(opName)
      base.push(`float ${opName} =` + evaluateModule(child))
      return ''
    })

  const allOps = nonControlChildren
    .map(function (child, index) {
      const opName = `_op0${index}`
      const opValue = `float ${opName} =` + evaluateModule(child)
      return {opName, opValue}
    })
  console.log('allOps', allOps)

  // build intermediary unions
  let prev = undefined
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

  console.log('unions', unions)
  const ops2 = unions.length>0? unions[unions.length - 1].opName : allOps[1].opName
  const opResult = allOps.map(op => op.opValue).concat(
    unions.map(op => op.opValue),
    [`return opS(${allOps[0].opName}, ${ops2} );`]
  ).join('\n')
  console.log('opResult', opResult)

  return opResult
}
