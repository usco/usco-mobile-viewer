import { model } from '../common/utils/modelUtils'

export function makeEntitiesModel (actions) {
  const defaults = []
  function addEntities (state, inputs) {
    return state.concat([inputs])
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
