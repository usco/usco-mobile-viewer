export function drawModel (regl, datas) {
  const data = datas[0]
  // const batchCallData = data.map(function())
  const {scene, entity, camera} = data
  const cmd = makeDrawCommand(regl, scene, entity)

  // for entitities
  // all sorts of 'dynamic' data
  const {pos, rot, sca} = entity.transforms
  const {modelMat} = entity

  // simple hack for selection state
  // const {color} = data
  const color = entity.meta.selected ? [1, 0, 0, 1] : entity.visuals.color
  return cmd({ color, mat: modelMat, scene, view: camera.view })
}
