import mat4 from 'gl-mat4'
import vec3 from 'gl-vec3'

var pick = require('camera-picking-ray')
var intersect = require('ray-aabb-intersection')

export default function pickLoop (fullData) {
  function onMouseChange (buttons, x, y, mods) {
    if (buttons !== 1) {
      return
    }
    console.log('mouse-change', fullData, buttons, x, y, mods)

    // Picking
    let screenWidth = window.innerWidth
    let screenHeight = window.innerHeight

    // your camera matrices
    var projection = mat4.perspective([],
      Math.PI / 4,
      screenWidth / screenHeight,
      0.01,
      1000)
    var view = fullData.camera.view
    var projView = mat4.multiply([], projection, view)
    var invProjView = mat4.invert([], projView)

    let ray = { // this data will get mutated to contain data
      ro: [0, 0, 0],
      rd: [0, 0, 0]
    }

    let mouse = [0, 0]
    let viewport = [0, 0, 320, 240]

    mouse = [x, y] // screenHeight -
    viewport = [ 0, 0, screenWidth, screenHeight ]

    // warning !!! posible issues with camera-unproject , itself used in other modules https://github.com/Jam3/camera-unproject/issues/1

    // store result in ray (origin, direction)
    pick(ray.ro, ray.rd, mouse, viewport, invProjView)
    const center = [0, 0, 0]
    const radius = 1.5

    fullData.entities.map(function (entity, index) {
      // FIXME: do this only once, and not here
      const {pos, rot, sca} = entity.transforms
      let modelMat = mat4.identity([])
      mat4.translate(modelMat, modelMat, [pos[0], pos[2], pos[1]]) // z up
      mat4.rotateX(modelMat, modelMat, rot[0])
      mat4.rotateY(modelMat, modelMat, rot[2])
      mat4.rotateZ(modelMat, modelMat, rot[1])
      mat4.scale(modelMat, modelMat, [sca[0], sca[2], sca[1]])

      // convert min & max to world coordinates
      let min = vec3.transformMat4(mat4.identity([]), entity.bounds.min, modelMat) // out:vec3, a:vec3, m:mat4
      let max = vec3.transformMat4(mat4.identity([]), entity.bounds.max, modelMat) // out:vec3, a:vec3, m:mat4

      const bounds = [min, max] // [entity.bounds.min, entity.bounds.max] // FIXME !!!! bounds are in local coordinates, not world coordinates !

      const hit = intersect([], ray.ro, ray.rd, bounds) // intersect([], ray.ro, ray.rd, center, radius)
      let hitResult = null
      if(hit){
        hitResult = {hit, entity, index}
        // just for testing 'pseudo' selection
        entity.selected = ! entity.selected
      }
      return hitResult
    })
    .filter(h=> h !== null )
    .forEach(hit=>console.log('hit', hit.entity.id))

    function pickStuff () {
      // first check aabb && sphere
      // then go into more precise stuff
    }
  }

  require('mouse-change')(onMouseChange)
}
