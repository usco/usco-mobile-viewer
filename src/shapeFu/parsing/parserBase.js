import { evaluateModule } from './evaluators'

function exec (parser, input, rootName = 'root' , callBack, options = {}) {
  console.log('attempting to parse', input)

  let curModule = { name: rootName, children: [], modules: [], argnames: [], argexpr: []} // transforms is for position , specific for distance field transforms

  let contextStack = []
  let moduleStack = []

  const {glslify} = options

  parser.yy.settings = {
    processModule: function (yy) {
      console.log('processModule')
      let lines = []
      /*if (glslify) {
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
      //let res = lines.join('\n')*/
      const res = evaluateModule(curModule, {})
      console.log('Module done', res)
      if (curModule.name === 'root' && callBack) {
        callBack(res)
      }
    },

    addModuleChild: function (child) {
      // console.log('adding child to module', JSON.stringify(child))
      curModule.children.push(child)
    },

    addModuleAssignmentVar: function (left, right) {
      // console.log('addModuleAssignmentVar',left, right)
      curModule.variables = curModule.variables ? curModule.variables : []
      curModule.variables.push({left, right})
    },

    addModuleFunction: function (name, expr, argnames, argexpr) {
      console.log('addModuleFunction', name, expr, argnames, argexpr)
    },

    stashModule: function (name, argnames, argexpr) {
      // const newModule = { parent: curModule, children: [], name, moduleStack: [], variableStack: [], modules:[]}
      const newModule = { name, children: [], modules: [], argnames, argexpr}
      console.log('stashModule', name, argnames, argexpr)

      moduleStack.push(curModule)
      curModule.modules.push(newModule)

      curModule = newModule
    },

    popModule: function () {
      console.log('popModule')
      curModule = moduleStack.pop()
    }

  }
  parser.parse(input)
}

export { exec as exec }
