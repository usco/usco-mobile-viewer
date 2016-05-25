
const params = {
  enabled: true,
  userZoom: true,
  userZoomSpeed:1.0,
  userRotate: true,
  userRotateSpeed: 1.0,

  userPan: true,
  userPanSpeed: 2.0,

  autoRotate: false,
  autoRotateSpeed: 2.0, // 30 seconds per round when fps is 60

  minPolarAngle: 0, // radians
  maxPolarAngle: Math.PI, // radians

  minDistance: 0.2,
  maxDistance: 1400,

  active: false,
  mainPointerPressed: false,

  EPS: 0.000001,
  PIXELS_PER_ROUND: 1800,

  phiDelta: 0,
  thetaDelta: 0,
  scale: 1,

  origPhiDelta: phiDelta,
  origThetaDelta: thetaDelta,
  origScale: scale,

  up: [0,1,0],
}

function update(params, dt){
  //this is a modified version, with inverted Y and Z (since we use camera.z => up)
  //we also allow multiple objects/cameras
  for(var i =0; i< params.objects.length;i++)
  {
    var object = params.objects[i]
    var center = params.centers[i]
    var camState = params.camStates[i]

    var curThetaDelta = camState.thetaDelta
    var curPhiDelta   = camState.phiDelta
    var curScale      = camState.scale

    var lastPosition = camState.lastPosition

    var position = object.position
    var offset = position.clone().sub( center )

    if(params.up[2] === 1)
    {
      // angle from z-axis around y-axis, upVector : z
      var theta = Math.atan2( offset.x, offset.y )
      // angle from y-axis
      var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.y * offset.y ), offset.z )
    }
    else
    {
      //in case of y up
      var theta = Math.atan2( offset.x, offset.z )
      var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y )
      curThetaDelta = -(curThetaDelta)
    }

    if ( params.autoRotate ) {
      //PER camera
      params.objects.map(function(object, index){
        if(scope.objectOptions[index].userRotate){
          scope.camStates[index].thetaDelta += getAutoRotationAngle()
        }
      })
    }

    theta += curThetaDelta
    phi += curPhiDelta

    // restrict phi to be between desired limits
    phi = Math.max( params.minPolarAngle, Math.min( params.maxPolarAngle, phi ) )
    // restrict phi to be betwee EPS and PI-EPS
    phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) )
    //multiply by scaling effect
    var radius = offset.length() * curScale
    // restrict radius to be between desired limits
    radius = Math.max( params.minDistance, Math.min( params.maxDistance, radius ) )

    if(params.up[2] === 1)
    {
      offset.x = radius * Math.sin( phi ) * Math.sin( theta )
      offset.z = radius * Math.cos( phi )
      offset.y = radius * Math.sin( phi ) * Math.cos( theta )
    }
    else
    {
      offset.x = radius * Math.sin( phi ) * Math.sin( theta )
      offset.y = radius * Math.cos( phi )
      offset.z = radius * Math.sin( phi ) * Math.cos( theta )
    }

    //
    position.copy( center ).add( offset )
    object.lookAt( center )

    if ( lastPosition.distanceTo( object.position ) > 0 ) {
        //this.active = true
        //this.dispatchEvent( changeEvent )
        lastPosition.copy( object.position )
    }
    camState.thetaDelta /= 1.5
    camState.phiDelta /= 1.5
    camState.scale = 1
  }
}


function setObservables (observables) {
  let {dragMoves$, zooms$} = observables

  let self = this

  /* are these useful ?
  scope.userZoomSpeed = 0.6
  onPinch
  */
  function zoom(zoomDir, zoomScale, cameras){

    if ( scope.enabled === false ) return
    if ( scope.userZoom === false ) return

    //PER camera
    cameras.map(function(object, index){
      if(scope.objectOptions[index].userZoom){

        if(zoomDir < 0) scope.camStates[index].scale /= zoomScale
        if(zoomDir > 0) scope.camStates[index].scale *= zoomScale
      }
    })
  }

  function rotate(cameras, angle){

    if ( scope.enabled === false ) return
    if ( scope.userRotate === false ) return

    //PER camera
    cameras.map(function(object, index){
      if(scope.objectOptions[index].userRotate){
        scope.camStates[index].thetaDelta += angle.x
        scope.camStates[index].phiDelta   += angle.y

      }
    })
  }

  //TODO: implement
  function pan(cameras, offset){
    //console.log(event)
    var _origDist = distance.clone()

     //do this PER camera
    cameras.map(function(object, index){
        if(scope.objectOptions[index].userPan){
          let distance = _origDist.clone()
          distance.transformDirection( object.matrix )
          distance.multiplyScalar( scope.userPanSpeed )

          object.position.add( distance )
          scope.centers[index].add( distance )
        }
      })
  }


  dragMoves$
    .subscribe(function(e){
      let delta = e.delta

      /*if ( angle === undefined ) {
      angle = 2 * Math.PI /180  * scope.userRotateSpeed
    }*/
      let angle ={x:0,y:0}
      angle.x = 2 * Math.PI * delta.x / PIXELS_PER_ROUND * scope.userRotateSpeed
      angle.y = -2 * Math.PI * delta.y / PIXELS_PER_ROUND * scope.userRotateSpeed

      //console.log("rotate by angle",angle)
      /*if ( angle === undefined ) {
        angle = 2 * Math.PI /180  * scope.userRotateSpeed
      } */
      rotate(self.objects, angle)

    })
    //.subscribe(e=>e)//console.log("dragMoves",e.delta))

  zooms$
    .subscribe(function(delta){
      let zoomScale = undefined
      if ( !zoomScale ) {
        zoomScale = getZoomScale()
      }
      zoom(delta, zoomScale, self.objects)
    })
    //.subscribe(e=>e)//console.log("zoom",e))

}
