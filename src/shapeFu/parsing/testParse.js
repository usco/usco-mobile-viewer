const parser = require('./parseOpenscad')
var fs = require('fs')

function geometryLookup () {
}

function flipVec3 (original) { // convert openscad z up to shapeFu inverted y up
  return [original[0], -original[2], original[1]]
}

function evaluateModule (module) {
  let lines = []
  // console.log('evaluateModule', module.name, module)

  const nonControlChildren = module.children.filter(child => child && child.name !== 'echo')

  nonControlChildren.forEach(function (child) {
    // console.log('child module', child)
    lines.push(evaluateModule(child))
  })

  if (module.name === 'cylinder') {
    // console.log('cylinder')
    const params = module.argnames.reduce(function (rs, argName, index) {
      rs[argName] = module.argexpr[index]
      return rs
    }, {})

    const r1 = params['r1'] ? params['r1'] : params['r']
    const r2 = params['r2'] ? params['r2'] : params['r']
    const h = params['h']


    lines.push(`return sdConeSection(pos, ${h}., ${r1}., ${r2}.);`)
    //lines.push(`float result = opS(cu1, c1);`)
  }

  return lines
}

function exec (parser, input, rootName='root') {
  let result = {}
  let curModule = { children: [], name: rootName, level: 0}

  parser.yy.settings = {
    processModule: function (yy) {
      let lines = []
      lines.push(`#pragma glslify: sdBox = require('../primitives/box.frag')`)
      lines.push(`#pragma glslify: sdConeSection = require('../primitives/coneSection.frag')`)
      lines.push(`#pragma glslify: opS = require('../operations/subtract.frag')`)
      lines.push(`#pragma glslify: opU = require('../operations/union.frag')`)
      lines.push(`float ${curModule.name}(vec3 pos){`)
      lines.push(evaluateModule(curModule))
      lines.push('}')
      lines.push(`#pragma glslify: export(${curModule.name})`)

      const res = lines.join('\n')
      fs.writeFileSync(__dirname + '/../shaders/demo-data/convTest.frag', res)
      console.log(res)
    },

    addModuleChild: function (child) {
      // console.log('adding child to module', JSON.stringify(child))
      curModule.children.push(child)
    }
  }
  parser.parse(input)
}

const input = fs.readFileSync(__dirname + '/test.scad', 'utf8')
console.log('attempting to parse', input)
exec(parser, input)
