// import boundingBox from './boundingBox'

function adjustedMachineVolumeByDissallowerAreas (machine) {
  const {machine_volume, machine_disallowed_areas} = machine

  let smallestNegative = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  let smallestPositive = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]

  machine_disallowed_areas
    .forEach(function (area) {
      // console.log('area', area)
      // kindof a hack, we find the dominant size
      let max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
      let min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]

      area.forEach(function (coords) {
        min[0] = coords[0] < min[0] ? coords[0] : min[0]
        min[1] = coords[1] < min[1] ? coords[1] : min[1]
        max[0] = coords[0] > max[0] ? coords[0] : max[0]
        max[1] = coords[1] > max[1] ? coords[1] : max[1]
      })
      const val = [max[0] - min[0], max[1] - min[1]]
      const biggestAxis = val[0] === Math.max(val[0], val[1]) ? 0 : 1
      // console.log('biggest ??',val , biggestAxis)

      area.forEach(function (coords) {
        if (coords[0] < 0 && biggestAxis === 1) {
          smallestNegative[0] = coords[0] > smallestNegative[0] ? coords[0] : smallestNegative[0]
        }
        if (coords[0] > 0 && biggestAxis === 1) {
          smallestPositive[0] = coords[0] < smallestPositive[0] ? coords[0] : smallestPositive[0]
        }

        if (coords[1] < 0 && biggestAxis === 0) {
          smallestNegative[1] = coords[1] > smallestNegative[1] ? coords[1] : smallestNegative[1]
        }
        if (coords[1] > 0 && biggestAxis === 0) {
          smallestPositive[1] = coords[1] < smallestPositive[1] ? coords[1] : smallestPositive[1]
        }
      })
    })
  // console.log('min', min, 'max', max)
  // console.log('furthest', furthest)
  return [smallestPositive[0] - smallestNegative[0], smallestPositive[1] - smallestNegative[1], machine_volume[2]]
}

export default function isObjectOutsideBounds (machine, entity) {
  const {bounds, transforms} = entity
  const {pos} = transforms
  const {machine_volume} = machine // machine volume assumed to be centered around [0,0,0]

  const adjustedVolume = adjustedMachineVolumeByDissallowerAreas(machine)
  //console.log('machine_volume', machine_volume, 'adjustedVolume', adjustedVolume)

  const halfVolume = adjustedVolume.map(x => x * 0.5)

  // const halfOut = (pos, bounds, idx) => pos[idx] + bounds.min[idx] <= -halfVolume[idx] || pos[idx] + bounds.max[idx] >= halfVolume[idx]
  // const aabbout = halfOut(pos, bounds, 0) || halfOut(pos, bounds, 1) || halfOut(pos, bounds, 2)
  // basic check based on machn dimensions
  const aabbout = pos.reduce(function (acc, val, idx) {
    let cur = val + bounds.min[idx] <= -halfVolume[idx] || val + bounds.max[idx] >= halfVolume[idx]
    return acc || cur
  }, false)

  return aabbout
}
