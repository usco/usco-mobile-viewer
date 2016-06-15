export function isMoving (moveDelta, deltaSqr) {
  return true
  /* let distSqr = (moveDelta.x * moveDelta.x + moveDelta.y * moveDelta.y)
  let isMoving = (distSqr > deltaSqr)
  // console.log("moving",isMoving)
  return isMoving*/
}

export function normalizeWheel (event) {
  let delta = {x: 0, y: 0}
  if (event.wheelDelta) { // WebKit / Opera / Explorer 9
    delta = event.wheelDelta
  } else if (event.detail) { // Firefox older
    delta = -event.detail
  }else if (event.deltaY) { // Firefox
    delta = -event.deltaY
  }

  return delta
}



////////FOr most.js

const repeat = (n, stream) =>
	n === 0 ? empty()
		: n === 1 ? stream
		: continueWith(() => repeat(n-1, stream), stream)
