const gl = require('gl')(256, 256)
const regl = require('regl')(gl)
import {writeContextToFile} from './utils'

const {clear} = regl

import { bunnyData, bunnyData2, bunnyData3, sceneData } from '../common/data'
import {params, update} from '../common/orbitControls'

const fullData = {
  sceneData,
  modelsData: [bunnyData, bunnyData2, bunnyData3],
  cameraData: update(params)
}

import _drawModel from '../proto1-basics/drawModel'
const drawModel = _drawModel.bind(null, regl)

function render (data) {
  const {cameraData} = data

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
