var regl = require('regl')()
var glslify = require('glslify-sync')
const {frame, buffer, prop} = regl

const drawFrame = regl({
  frag: glslify(__dirname + '/shaders/slicerBaseTest.frag'),
  vert: glslify(__dirname + '/shaders/base.vert'),

  attributes: {
    position: buffer([
      -2, 0,
      0, -2,
      2, 2])
  },

  uniforms: {
    view: prop('view'),
    iResolution: ({viewportWidth, viewportHeight}, props) => [viewportWidth, viewportHeight],
    /*iGlobalTime2: function(props,{count}){
      //(props, {count}) => 0.01 * count + 15
      console.log('count',count, props)
      return 0.01 * count + 15
    },*/
    iGlobalTime: function (context, props) {
      let time = regl.context('time')
      time = 0.1 * time.id + 15
      return time
    },

    bgColor: prop('bgColor'),
    toggleSoftShadows: prop('toggleSoftShadows'),
    toggleAO: prop('toggleAO'),

    uRM_maxIterations: prop('rayMarch.uRM_maxIterations'),
    uRM_stop_threshold: prop('rayMarch.uRM_stop_threshold'),
    uRM_grad_step: prop('rayMarch.uRM_grad_step'),
    uRM_clip_far: prop('rayMarch.uRM_clip_far'),

    'lights[0].color': prop('scene.lights[0].color'),
    'lights[0].intensity': prop('scene.lights[0].intensity'),
    'lights[0].position': prop('scene.lights[0].position'),

    'lights[1].color': prop('scene.lights[1].color'),
    'lights[1].intensity': prop('scene.lights[1].intensity'),
    'lights[1].position': prop('scene.lights[1].position'),

    'lights[2].color': prop('scene.lights[2].color'),
    'lights[2].intensity': prop('scene.lights[2].intensity'),
    'lights[2].position': prop('scene.lights[2].position'),

    'lights[3].color': prop('scene.lights[3].color'),
    'lights[3].intensity': prop('scene.lights[3].intensity'),
    'lights[3].position': prop('scene.lights[3].position')
  },

  count: 3
})

export default drawFrame
