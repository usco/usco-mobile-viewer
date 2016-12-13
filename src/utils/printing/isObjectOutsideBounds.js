// import boundingBox from './boundingBox'

function computeMinMaxOfPoints (data) {
  let max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  let min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  data.forEach(function (coords) {
    min[0] = coords[0] < min[0] ? coords[0] : min[0]
    min[1] = coords[1] < min[1] ? coords[1] : min[1]
    max[0] = coords[0] > max[0] ? coords[0] : max[0]
    max[1] = coords[1] > max[1] ? coords[1] : max[1]
  })
  return {min, max}
}

function computeSizeOfPoints (data) {
  let max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  let min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  data.forEach(function (coords) {
    min[0] = coords[0] < min[0] ? coords[0] : min[0]
    min[1] = coords[1] < min[1] ? coords[1] : min[1]
    max[0] = coords[0] > max[0] ? coords[0] : max[0]
    max[1] = coords[1] > max[1] ? coords[1] : max[1]
  })
  return [max[0] - min[0], max[1] - min[1], 0]
}

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
  const {machine_volume, printable_area} = machine // machine volume assumed to be centered around [0,0,0]

  const adjustedVolume = [printable_area[0], printable_area[1], machine_volume[2]] // adjustedMachineVolumeByDissallowerAreas(machine)
  let halfVolume = adjustedVolume.map(x => x * 0.5)
  halfVolume[2] *= 2 // z is ABOVE the build plate , so not actually centered around 0

  // basic check based on machn dimensions
  const aabbout = pos.reduce(function (acc, val, idx) {
    let cur = (val + bounds.min[idx]) <= -halfVolume[idx] || val + bounds.max[idx] >= halfVolume[idx]
    // console.log('halfVolume along',idx, halfVolume[idx])
    /*const objOffsetMin = val + bounds.min[idx]
    const halfVol = -halfVolume[idx]
    const result = objOffsetMin <= halfVol
    console.log('min', objOffsetMin, halfVol, result)

    const objOffsetMax = val + bounds.max[idx]
    const halfVol2 = halfVolume[idx]
    const result2 = objOffsetMax >= halfVol2
    console.log('halfVolume along',idx, halfVol)
    console.log('max', objOffsetMax, halfVol2, result2)*/

    return acc || cur
  }, false)

  return aabbout
}
