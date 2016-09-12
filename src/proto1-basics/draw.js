import { perspective } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

import {makeDrawMeshCommand} from './drawCommands/drawMesh'
import {makeDrawCommand} from './drawCommands/drawAll'

/*
 => draw all things that need to be drawn in style A
 => draw all things that need to be drawn in style B
*/

import drawBase from './drawCommands/drawMesh/drawBase'



/*
* memoize.js
* by @philogb and @addyosmani
* with further optimizations by @mathias
* and @DmitryBaranovsk
* perf tests: http://bit.ly/q3zpG3
* Released under an MIT license.
*/
export function memoize (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments),
      hash = '',
      i = args.length
    let currentArg = null
    while (i--) {
      currentArg = args[i]
      hash += (currentArg === Object(currentArg)) ?
        JSON.stringify(currentArg) : currentArg
      fn.memoize || (fn.memoize = {})
    }
    return (hash in fn.memoize) ? fn.memoize[hash] :
      fn.memoize[hash] = fn.apply(this, args)
  }
}

function hashCode (str) {
  var hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

export function hashEntityForRender (entity) {
  const vertShader = hashCode(entity.visuals && entity.visuals.vert ? entity.visuals.vert : 'base')
  const fragShader = hashCode(entity.visuals && entity.visuals.frag ? entity.visuals.frag : 'base')
  const hash = JSON.stringify({geom: entity.geometry.id, fragShader, vertShader})
  return hash
}


let meshSceneItems = []
let meshSceneCmd

export function makeDrawCalls (regl, data) {
  /*
  Things that need different drawCalls
  Geometry
  visuals:
    entity.visuals.vert
    entity.visuals.frag
  */

  const hashSet = new Set()
  const hashStore = {}

  //what drawCommands are available
  const drawCmds = {
    'mesh':drawBase,//makeDrawMeshCommand,
    undefined: makeDrawCommand
  }

  // this needs to change everytime geometry and OR shaders changes: determines drawCalls, rarely changes /triggered
  const entitiesWithHash = data.entities.map(function (entity) {
    const {scene} = data
    let drawData = Object.assign({}, data, {entity}, {geometry: entity.geometry, extras: {}})
    if(entity.visuals && entity.visuals.params){
      Object.keys(entity.visuals.params).map(function(key){
        drawData.extras[key] = entity.visuals.params[key]
      })
    }

    const drawCmdType = entity.visuals && entity.visuals.type ? entity.visuals.type : undefined
    const cmd = drawCmds[drawCmdType](regl, drawData)
      //entity.visuals && entity.visuals.type && entity.visuals.type ==='mesh'? makeDrawMeshCommand (regl, scene, entity): makeDrawCommand(regl, scene, entity)

    const hash = hashEntityForRender(entity)
    hashSet.add(hash)

    hashStore[hash] = cmd
    //const customDrawCmd

    const updatedEntity = Object.assign({}, entity, {_renderBatchId: hash, entryDraw:cmd})
    if(drawCmdType === 'mesh'){
      meshSceneItems.push(updatedEntity)
    }
    return updatedEntity
  })

  meshSceneCmd = makeDrawMeshCommand(regl, meshSceneItems)

  //console.log('hashSet', hashSet)
  //console.log(hashSet.has(JSON.stringify({geom: data.entities[0].geometry.id, fragShader: 'base',vertShader: 'base'})))
  //console.log(hashSet.has('foo'))
  return {hashStore, entities: entitiesWithHash}
}

let counter = 0
export function draw (regl, hashStore, data) {
  // more dynamic this can change every frame
  //console.log('hashStore', hashStore)
  const _dynamicData = data.entities
    .filter(entity => entity.visuals && entity.visuals.type && entity.visuals.type ==='mesh')
    .filter(entity => entity.visuals.visible !== undefined ? entity.visuals.visible : true)
    .map(function (entity, index) {
      const {modelMat} = entity
      const {scene, camera} = data

      // simple hack for selection state
      //const color = entity.meta.pickable && entity.meta.selected  && ? [1, 0, 0, 1] : entity.visuals.color
      let color = entity.visuals.color || [1,1,1,1]
      if(entity.meta.pickable && entity.meta.selected){
        color = [1,0,0,1]
      }
      const entryDraw = entity.entryDraw
      //counter += 1

      const callData = { color, mat: modelMat, scene, view: camera.view, counter, entryDraw }
      return callData
  })
  meshSceneCmd(_dynamicData)


  let batches2 = {}
  const dynamicData = data.entities
    .filter(entity => entity.visuals.visible !== undefined ? entity.visuals.visible : true)
    .map(function (entity, index) {
      const {modelMat} = entity
      const {scene, camera} = data

      const drawCmdType = entity.visuals && entity.visuals.type ? entity.visuals.type : undefined

      if(drawCmdType ==='mesh'){
        return
      }


      // simple hack for selection state
      const color = entity.meta.selected ? [1, 0, 0, 1] : entity.visuals.color

      const drawCall = hashStore[entity._renderBatchId]
      counter += 1

      const callData = { color, mat: modelMat, scene, view: camera.view, counter }
      if(!batches2[entity._renderBatchId]){
        batches2[entity._renderBatchId] = []
      }
      batches2[entity._renderBatchId].push(callData)

      //return {drawCall, callData}
      return drawCall(callData)
  })
  return dynamicData


  //console.log('dynamicData', batches2)
  //throw new Error('mlk')
  let drawCalls = []
  /*Object.keys(batches2).map(function(id, index){
    console.log('kjhjk', id, index)
    const _data = batches2[id]
    const _d = dynamicData[index].drawCall
    const _dcall = _d(_data)
     drawCalls.push[_dcall]
  })*/
  //
  //return drawCalls


  const id = Object.keys(batches2)[0]
  const id2 = Object.keys(batches2)[1]
  const id3 = Object.keys(batches2)[2]

  const bunniesData = batches2[id]
  const data2 = batches2[id2]
  const shadowPlaneData = batches2[id3]
  const meshesCallData = bunniesData.concat(shadowPlaneData)

  //console.log('data1', bunniesData, shadowPlaneData)
  console.log('meshesCallData', meshesCallData)
  throw new Error('mlk')
  const meshesCall =  dynamicData[0].drawCall(meshesCallData)
  //const gridCall =  dynamicData[3].drawCall(data2)
  //const fooCall =  dynamicData[0].drawCall(batches2[id3])

  return []//, fooCall]//, gridCall]
}
