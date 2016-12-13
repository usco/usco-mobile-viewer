import { model } from './utils/modelUtils'
import { isObjectOutsideBounds } from 'usco-printing-utils'
import { combine, combineArray, merge, just } from 'most'

export function makeEntitiesModel (actions) {
  const defaults = []
  function addEntities (state, inputs) {
    return state.concat([inputs])
  }
  function setEntityColors (state, inputs) {
    return state.map(function (entity) {
      if (entity.meta.id === inputs.id) {
        const visuals = Object.assign({}, entity.visuals, {color: inputs.color})
        return Object.assign({}, entity, {visuals})
      }
      return entity
    })
  }
  function setEntityBoundsStatus (state, input) {
    //console.log('setEntityBoundsStatus')
    return state.map(function (entity) {
      const outOfBounds = isObjectOutsideBounds(input, entity)
      const bounds = Object.assign({}, entity.bounds, {outOfBounds})
      return Object.assign({}, entity, {bounds})
    })
  }
  const updateFunctions = {addEntities, setEntityColors, setEntityBoundsStatus}
  const state$ = model(defaults, actions, updateFunctions)

  return state$.skipRepeats().multicast()
}

export function makeMachineModel (actions) {
  const defaults = undefined
  function setMachineParams (state, inputs) {
    const machine = {params: inputs}
    return machine
  }
  const updateFunctions = {setMachineParams}
  const state$ = model(defaults, actions, updateFunctions)

  return state$.skipRepeats().multicast()
}

export function makeState (machine$, entities$) {
  const appState$ = combineArray(
    function (entities, machine) {
      return {entities, machine}
    }, [entities$, machine$])
  return appState$
}
