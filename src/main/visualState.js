import { combine, combineArray, merge } from 'most'
import makeDrawEnclosure from './drawCommands/drawEnclosure'
import drawStaticMesh from './drawCommands/drawStaticMesh2/index'

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

  // const outOfBoundsColor = [1., 0.6, 0.16, 1. ]//(red: 255, green: 140, blue: 16
  // const background = [1,1,1,1]

  const outOfBoundsColor = [0.15, 0.15, 0.15, 0.3]
  const background = [0.96, 0.96, 0.96, 1]
  return combineArray(
    function (entities, machine, camera) {
      const view = camera.view
      return {entities, machine, view, camera, background, outOfBoundsColor}
    }, [entitiesWithVisuals$, machineWithVisuals$, camState$])
}
