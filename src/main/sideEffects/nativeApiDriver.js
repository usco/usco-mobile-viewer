// setModelUri('http://localhost:8080/data/sanguinololu_enclosure_full.stl')
import callBackToStream from '../../common/utils/most/callBackToStream'

export default function nativeApiDriver(out$){

  const makeModelUriFromCb = callBackToStream()
  const modelUri$ = makeModelUriFromCb.stream

  const makeMachineParamsFromCb = callBackToStream()
  const machineParams$ = makeMachineParamsFromCb.stream
  // ugh but no choice
  window.setModelUri = makeModelUriFromCb.callback
  window.setMachineParams = makeMachineParamsFromCb.callback

  return {
    machineParams$,
    modelUri$
  }
}
