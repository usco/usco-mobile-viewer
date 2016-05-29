const parser = require('./parseOpenscad')
//const parser = require('./openscadParser.js').parser

var fs = require('fs')

import {exec} from './parserBase.js'

const input = fs.readFileSync(__dirname + '/test.scad', 'utf8')
exec(parser, input)
