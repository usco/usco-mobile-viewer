function geometryLookup () {
}

function flipVec3 (original) { // convert openscad z up to shapeFu inverted y up
  return [original[0], -original[2], original[1]]
}

function flipVec3Abs (original) { // convert openscad z up to shapeFu inverted y up, not negated
  return [original[0], original[2], original[1]]
}

function vecToStr (original) {
  return (`vec${original.length}(${original.join('.,')}.)`)
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
    const params = module.argnames.reduce(function (rs, argName, index) {
      rs[argName] = module.argexpr[index]
      return rs
    }, {})

    const r1 = params['r1'] ? params['r1'] : params['r']
    const r2 = params['r2'] ? params['r2'] : params['r']
    const h = params['h']

    lines.push(` sdConeSection(pos, ${h}., ${r1 * 2}., ${r2 * 2}.);`)
  // lines.push(`float result = opS(cu1, c1);`)
  }

  if (module.name === 'translate') {
    // console.log(module.argnames, module.argexpr)
    let pos = module.argexpr[0].children
    // console.log('pos', pos)
    lines.push('{')
    lines.push(`pos += vec3(${pos});`)
  }

  if (module.name === 'cube') {
    const params = module.argnames.reduce(function (rs, argName, index) {
      rs[argName] = module.argexpr[index]
      return rs
    }, {})

    let size = params['size'].children
    const center = params['center'] ? params['center'] : false
    let pos = [0, 0, 0]
    if (!center) {
      pos = [size[0] / 2, size[1] / 2, size[2] / 2]
    }

    vecToStr(size)

    // to string
    pos = flipVec3(pos)
    size = flipVec3Abs(size)

    const res = ` sdBox(pos + ${vecToStr(pos)}, ${vecToStr(size)});`
    console.log('cube', params, size, center, module)
    lines.push(res)
  }

  if (module.name === 'difference') {
    // let res = 'opS('
    let base = []
    let operandNames = []
    nonControlChildren.forEach(function (child, index) {
      // console.log('child module', child)

      /*if (index > 2) {
        lines.push(`result = opU()`)
      }*/
      const opName = `foo${index}`
      operandNames.push(opName)
      base.push(`float ${opName} =` + evaluateModule(child))
    // res += evaluateModule(child) + ','
    })
    let res = base.join('\n')

    let op = 'return opS(' + operandNames.join(',') + ');'

    return res + `
` + op
  } else {
    nonControlChildren.forEach(function (child) {
      // console.log('child module', child)
      lines.push(evaluateModule(child))
    })
  }

  return lines.join('\n')
}

function exec (parser, input, rootName = 'root', callBack) {
  console.log('attempting to parse', input)

  let result = {}
  let curModule = { children: [], name: rootName, level: 0}

  parser.yy.settings = {
    processModule: function (yy) {
      let lines = []
      //lines.push(`#pragma glslify: sdBox = require('../primitives/box.frag')`)
      //lines.push(`#pragma glslify: sdConeSection = require('../primitives/coneSection.frag')`)
      //lines.push(`#pragma glslify: opS = require('../operations/subtract.frag')`)
      //lines.push(`#pragma glslify: opU = require('../operations/union.frag')`)
      lines.push(`float ${curModule.name}(vec3 pos)`)
      lines.push(evaluateModule(curModule))
      lines.push('}')
      //lines.push(`#pragma glslify: export(${curModule.name})`)

      const res = lines.join('\n')
      // fs.writeFileSync(__dirname + '/../shaders/demo-data/convTest.frag', res)
      if (callBack) {
        callBack(res)
      }
      //console.log(res)
    },

    addModuleChild: function (child) {
      // console.log('adding child to module', JSON.stringify(child))
      curModule.children.push(child)
    }
  }
  parser.parse(input)
}

export { exec as exec }
