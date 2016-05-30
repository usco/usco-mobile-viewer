import { cylinder, cuboid } from './primitives'
import { flipVec3 } from './utils'
function geometryLookup () {
}

function evaluate (node) {
  switch (node.type) {
    case expression:

      break
  }
}

function evaluateModule (module) {
  let lines = []
  // console.log('evaluateModule', module.name, module)

  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')

  if (module.name === 'cylinder') {
    // console.log('cylinder')
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
    const opResult = allOps.map(op => op.opValue).concat(
      unions.map(op => op.opValue),
      [`return opS(${allOps[0].opName}, ${unions[unions.length - 1].opName} );`]
    ).join('\n')
    console.log('opResult', opResult)

    return opResult
    let res = base.join('\n')
    let op = 'return opS(' + operandNames.join(',') + ');'
    return res + `` + op


  } else {
    nonControlChildren.forEach(function (child) {
      // console.log('child module', child)
      lines.push(evaluateModule(child))
    })
  }

  return lines.join('\n')
}

function exec (parser, input, rootName = 'root' , callBack, options = {}) {
  console.log('attempting to parse', input)

  let result = {}
  let curModule = { children: [], name: rootName, level: 0}

  const {glslify} = options

  parser.yy.settings = {
    processModule: function (yy) {
      let lines = []
      if (glslify) {
        lines.push(`#pragma glslify: sdBox = require('../primitives/box.frag')`)
        lines.push(`#pragma glslify: sdConeSection = require('../primitives/coneSection.frag')`)
        lines.push(`#pragma glslify: opS = require('../operations/subtract.frag')`)
        lines.push(`#pragma glslify: opU = require('../operations/union.frag')`)
      }

      lines.push(`float ${curModule.name}(vec3 pos){`)
      lines.push(evaluateModule(curModule))
      lines.push('}')

      if (glslify) {
        lines.push(`#pragma glslify: export(${curModule.name})`)
      }
      const res = lines.join('\n')

      if (callBack) {
        callBack(res)
      }
    },

    addModuleChild: function (child) {
      // console.log('adding child to module', JSON.stringify(child))
      curModule.children.push(child)
    }
  }
  parser.parse(input)
}

export { exec as exec }
