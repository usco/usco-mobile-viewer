function adjustedMachineVolumeByDissallowerAreas(machine){
  const {machine_volume, machine_disallowed_areas} = machine


  let adjustedVolume = machine_volume
  machine_disallowed_areas
    .forEach(function(area){
      console.log('area',area)
      //{height: machine_volume[2], coords: area}))
    })
  return adjustedVolume
}

export default function isObjectOutsideBounds (machine, entity) {
  const {bounds, transforms} = entity
  const {pos} = transforms
  const {machine_volume} = machine // machine volume assumed to be centered around [0,0,0]

  const halfVolume = machine_volume.map(x => x * 0.5)
  //adjustedMachineVolumeByDissallowerAreas(machine)

  //const halfOut = (pos, bounds, idx) => pos[idx] + bounds.min[idx] <= -halfVolume[idx] || pos[idx] + bounds.max[idx] >= halfVolume[idx]
  // const aabbout = halfOut(pos, bounds, 0) || halfOut(pos, bounds, 1) || halfOut(pos, bounds, 2)
  //basic check based on machn dimensions
  const aabbout = pos.reduce(function (acc, val, idx) {
    let cur = val + bounds.min[idx] <= -halfVolume[idx] || val + bounds.max[idx] >= halfVolume[idx]
    return acc || cur
  }, false)


  return aabbout
}
