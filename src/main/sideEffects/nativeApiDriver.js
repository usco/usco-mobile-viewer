// setModelUri('http://localhost:8080/data/sanguinololu_enclosure_full.stl')
import callBackToStream from '../../common/utils/most/callBackToStream'
import formatRawMachineData from '../../common/utils/formatRawMachineData'

export default function nativeApiDriver(out$){

  const makeModelUriFromCb = callBackToStream()
  const modelUri$ = makeModelUriFromCb.stream

  const makeMachineParamsFromCb = callBackToStream()
  const machineParams$ = makeMachineParamsFromCb.stream.map(formatRawMachineData)
  // ugh but no choice
  window.nativeApi = {}
  window.nativeApi.setModelUri = makeModelUriFromCb.callback
  window.nativeApi.setMachineParams = makeMachineParamsFromCb.callback

  return {
    machineParams$,
    modelUri$
  }
}
