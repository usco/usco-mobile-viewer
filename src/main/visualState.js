import { combine, combineArray, merge } from 'most'
import makeDrawEnclosure from './drawCommands/drawEnclosure'
import drawStaticMesh from './drawCommands/drawStaticMesh2/index'

import isObjectOutsideBounds from '../common/bounds/isObjectOutsideBounds'

export function makeVisualState (regl, machine$, entities$, camState$) {
  const machineWithVisuals$ = machine$
    .map(function (machine) {
      if (machine !== undefined) {
        const draw = makeDrawEnclosure(regl, machine.params)
        return Object.assign({}, machine, {draw})
      }
    })

  const entitiesWithVisuals$ = entities$
    .map(function (entities) {
      return entities
        .map(function (data) {
          const geometry = data.geometry
          const draw = drawStaticMesh(regl, {geometry: geometry}) // one command per mesh, but is faster
          const visuals = Object.assign({}, data.visuals, {draw})
          const entity = Object.assign({}, data, {visuals}) // Object.assign({}, data, {visuals: {draw}})
          return entity
        })
    })

  return combineArray(
    function (entities, machine, camera) {
      /*if(machine && machine.params){
        entities = entities.map(function(entity){
          const out = isObjectOutsideBounds(machine.params, entity)
          if(!out){
            return entity
          }
          console.log('jkjhkj')
          const visuals = Object.assign({}, entity.visuals,{color:[1,0,0,1]})

          let entity2 = Object.assign({}, entity, {visuals})
          return entity2
        })
      }*/
      return {entities, machine, camera, background: [1, 1, 1, 1]}
    }, [entitiesWithVisuals$, machineWithVisuals$, camState$])
}
