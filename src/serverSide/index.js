const gl = require('gl')(256, 256)
const regl = require('regl')(gl)
import {writeContextToFile} from './utils'

const {clear} = regl

import { bunnyData, bunnyData2, bunnyData3, sceneData } from '../proto1/data'
import {params, update} from '../common/orbitControls'

const cameraData = update(params)
const fullData = {
  sceneData,
  modelsData: [bunnyData, bunnyData2, bunnyData3]
}

import _drawModel from '../proto1/drawModel'
const drawModel = _drawModel.bind(null, regl)

function render (data) {
  clear({
    depth: 1,
    color: [1, 1, 1, 1]
  })
  drawModel(data.sceneData, data.modelsData[0], cameraData)
  drawModel(data.sceneData, data.modelsData[1], cameraData)
  drawModel(data.sceneData, data.modelsData[2], cameraData)
}

render(fullData)
writeContextToFile(gl, 256, 256, 4, 'foo.png')
