const parser = require('./parseOpenscad')
var fs = require('fs')

function exec (input) {
  return parser.parse(input)
}

const input = fs.readFileSync(__dirname + '/test.scad', 'utf8')
console.log('attempting to parse', input)
const result = exec(input)
console.log('result', result)
