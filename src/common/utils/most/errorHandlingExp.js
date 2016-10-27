/*
function valueAndError (stream) {
  const base$ = stream
    .map(value => ({value}))
    .flatMapError(function (error) {
      console.log('error here', error)
      return just({error})
    })

  const error$ = base$.filter(x => 'error' in x).map(x => x.error)
  const value$ = base$.filter(x => 'value' in x).map(x => x.value)

  return {
    value$,
    error$}
}
function filterPluck(stream, name){
  return stream.filter(x => name in x).map(x => x[name])
}*/

/*const setMachineParamsSource$ = merge(
  nativeApi.machineParams$
).multicast()

const setMachineParams$ = valueAndError(setMachineParamsSource$)
const setMachineParamsErrors$ = setMachineParams$.filter()*/

/*const foo = recoveredAndError(merge(nativeApi.machineParams$))
foo.recovered$.forEach(e => console.log('recovered', e))
foo.error$.forEach(e => console.log('MAGIC error', e))*/
