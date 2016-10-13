const sceneData = {
  cameras: [
    {
      pos: [75, 75, 145], // [100,-100,100]
      up: [0, 0, 1],
      lens: {
        fov: 45,
        near: 0.1,
        far: 20000
      }
    }
  ],
  controls: [ // not in use !!! see orbitControls.js directly
    {
      up: [0, 0, 1],
      rotateSpeed: 0.2,
      panSpeed: 2.0,
      zoomSpeed: 2.0,
      autoRotate: {
        enabled: false,
        speed: 0.2
      },
      enabled: true
    }
  ],
  // lighting data
  lights: [
    {position: [100, 100, 200], color: [0.8, 0.6, 0.6], intensity: 0.4},
    {position: [-100, -200, 100], color: [0.75, 0.7, 0.7], intensity: 0.4},
    {position: [100, 200, -210], color: [0.9, 0.9, 0.9], intensity: 0.4},
    {position: [-100, -210, -200], color: [0.7, 0.7, 0.8], intensity: 0.4}
  ]
}

export { sceneData }
