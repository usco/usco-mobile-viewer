import { model } from '../common/utils/modelUtils'

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
  const updateFunctions = {addEntities}
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
