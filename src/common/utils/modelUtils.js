import { fromEvent, combineArray, combine, mergeArray, just } from 'most'

function stateHelper (actions, updateFunctions) {
  let modifiers$ = Object.keys(actions).map(function (key) {
    let action = actions[key]
    let actionName = key.replace(/\$/g, '')
    let modifierFunction = updateFunctions[actionName]

    if (modifierFunction && action) {
      let mod$ = action
        .map((input) => (state) => {
          state = modifierFunction(state, input) // call the adapted function
          return state
        })
      return mod$
    }
  })
    .filter(e => e !== undefined)

  return mergeArray(
    modifiers$
  )
}

function smartStateFold (prev, curr) {
  // console.log("prev",prev,"cur",curr)
  if (typeof curr === 'function') {
    return curr(prev)
  } else if (typeof prev === 'function') {
    return prev(curr)
  } else {
    return prev
  }
}

export function model (defaults, actions, updateFunctions) {
  const source$ = just(defaults)
  const modifications$ = stateHelper(actions, updateFunctions)
  return modifications$
    .merge(source$)
    .scan(smartStateFold, defaults) // combine existing data with new one
    // .distinctUntilChanged()
    .multicast()
}
