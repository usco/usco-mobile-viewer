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


export function makeMachineParamsModel (actions) {
  const defaults = {}
  function setMachineParams (state, inputs) {
    state = Object.assign({}, inputs)
    //console.log('state', state)
    return state
  }
  const updateFunctions = {setMachineParams}
  const state$ = model(defaults, actions, updateFunctions)

  return state$.skipRepeats().multicast()
}
