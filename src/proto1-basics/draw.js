import { identity, perspective, lookAt } from 'gl-mat4'
import mat4 from 'gl-mat4'
import normals from 'angle-normals'

import {makeDrawMeshCommand} from './drawCommands/drawMesh'
import {makeDrawCommand} from './drawCommands/drawAll'



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
    'mesh':makeDrawMeshCommand,
    undefined: makeDrawCommand
  }

  // this needs to change everytime geometry and OR shaders changes: determines drawCalls, rarely changes /triggered
  const entitiesWithHash = data.entities.map(function (entity) {
    const {scene} = data
    const drawData = Object.assign({}, data, {entity})

    const drawCmdType = entity.visuals && entity.visuals.type ? entity.visuals.type : undefined
    const cmd = drawCmds[drawCmdType](regl, drawData)
      //entity.visuals && entity.visuals.type && entity.visuals.type ==='mesh'? makeDrawMeshCommand (regl, scene, entity): makeDrawCommand(regl, scene, entity)

    const hash = hashEntityForRender(entity)
    hashSet.add(hash)

    hashStore[hash] = cmd
    return Object.assign({}, entity, {_renderBatchId: hash})
  })

  //console.log('hashSet', hashSet)
  //console.log(hashSet.has(JSON.stringify({geom: data.entities[0].geometry.id, fragShader: 'base',vertShader: 'base'})))
  //console.log(hashSet.has('foo'))
  return {hashStore, entities: entitiesWithHash}
}

export function draw (regl, hashStore, data) {
  // more dynamic this can change every frame
  const dynamicData = data.entities
    .filter(entity => entity.visuals.visible !== undefined ? entity.visuals.visible : true)
    .map(function (entity, index) {
      const {modelMat} = entity
      const {scene, camera} = data

      // simple hack for selection state
      const color = entity.meta.selected ? [1, 0, 0, 1] : entity.visuals.color

      const drawCall = hashStore[entity._renderBatchId]
      return drawCall({ color, mat: modelMat, scene, view: camera.view })
  })

  return dynamicData
}
