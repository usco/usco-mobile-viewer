/*
import { bunnyData, bunnyData2, bunnyData3, sceneData } from '../common/data'
import makeGrid from './grid'
import makeShadowPlane from './shadowPlane'
import makeTransformGizmo from './transformsGizmo'
// import { draw as _draw, makeDrawCalls } from './drawCommands/alternative/multipassGlow'
// import { draw as _draw, makeDrawCalls } from './drawCommands/alternative/basic'
//import { draw as _draw, makeDrawCalls, generateDrawFnForEntity } from './draw'

const grid = makeGrid({size: [16, 16], ticks: 1})
const gizmo = makeTransformGizmo()
const shadowPlane = makeShadowPlane(160)

function flatten (arr) {
  return arr.reduce(function (a, b) {
    return a.concat(b)
  }, [])
}

let fullData = {
  scene: sceneData,
  entities: flatten([bunnyData, bunnyData2, bunnyData3, grid, shadowPlane, ]) // gizmo])
}

// apply all changes
fullData.entities = fullData.entities
  .map(injectBounds)
  .map(injectTMatrix)
  .map(injectNormals)

// inject bactching/rendering data
const {hashStore, entities} = makeDrawCalls(regl, fullData)
fullData.entities = entities

// const drawModel = _drawModel.bind(null, regl)
//const draw = _draw.bind(null, regl)
// ============================================
// main render function: data in, rendered frame out
function render (data) {
  //draw(hashStore, data)
}

// render one frame
// render(fullData)


// interactions : picking
const picks$ = pickStream({gestures}, fullData)
  .tap(e => console.log('picks', e))

const selections$ = just(fullData.entities)
  .map(function (x) {
    return x.filter(x => 'meta' in x).filter(x => x.meta.selected)
  })
  .startWith([])
  .merge(picks$)
  .scan((acc, cur) => {
  }, [])
  .filter(x => x !== undefined)
  .forEach(e => console.log('selections', e))

function upsertCameraState (cameraState) {
  let data = fullData
  data.camera = cameraState
  return data
}

// FIXME ! this is a hack, just for testing, also , imperative

function setSelection ({entity}) {
  console.log('setting seletion')
  entity.meta.selected = !entity.meta.selected
  return entity
}

const stateWithCameraState$ = camState$
  .map(upsertCameraState)

const stateWithSelectionState$ = picks$
  .map(x => x.map(setSelection))
  .map(e => fullData)

// merge all the things that should trigger a re-render
merge(
  stateWithCameraState$,
  stateWithSelectionState$
)
// .forEach(render)
*/
