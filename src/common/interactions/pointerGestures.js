import most from 'most'
import { fromEvent, merge, empty } from 'most'
import assign from 'fast.js/object/assign' // faster object.assign
import { isMoving, normalizeWheel } from './utils'

// this is in another package/module normally
export function preventDefault (event) {
  event.preventDefault()
  return event
}
export function interactionsFromEvents (targetEl) {
  let mouseDowns$ = fromEvent('mousedown', targetEl)
  let mouseUps$ = fromEvent('mouseup', targetEl)
  let mouseLeaves$ = fromEvent('mouseleave', targetEl).merge(fromEvent('mouseout', targetEl))
  let mouseMoves$ = fromEvent('mousemove',targetEl).takeUntil(mouseLeaves$) // altMouseMoves(fromEvent(targetEl, 'mousemove')).takeUntil(mouseLeaves$)

  let rightClicks$ = fromEvent('contextmenu', targetEl).tap(preventDefault) // disable the context menu / right click
  let zooms$ = fromEvent('wheel', targetEl).map(normalizeWheel)

  let touchStart$ = fromEvent('touchstart', targetEl) // dom.touchstart(window)
  let touchMoves$ = fromEvent('touchmove', targetEl) // dom.touchmove(window)
  let touchEnd$ = fromEvent('touchend', targetEl) // dom.touchend(window)

  return {
    mouseDowns$,
    mouseUps$,
    mouseMoves$,

    rightClicks$,
    zooms$,

    touchStart$,
    touchMoves$,
    touchEnd$}
}

// based on http://jsfiddle.net/mattpodwysocki/pfCqq/
function mouseDrags (mouseDowns$, mouseUps, mouseMoves, longPressDelay = 250 , deltaSqr) {
  return mouseDowns$.flatMap(function (md) {
    // calculate offsets when mouse down
    let startX = md.offsetX
    let startY = md.offsetY
    // Calculate delta with mousemove until mouseup
    return mouseMoves
      .map(function (e) {
        let delta = {
          left: e.clientX - startX,
          top: e.clientY - startY
        }
        return assign({}, e, delta)
      })
      .takeUntil(mouseUps)
  })
}

function touchDrags (touchStart$, touchEnd$, touchMove$) {
  return touchStart$
    .flatMap(function (ts) {
      let startX = ts.touches[0].pageX
      let startY = ts.touches[0].pageY

      return touchMove$
        .map(function (e) {
          let x = (e.touches[0].pageX - startX) / 5.0
          let y = (e.touches[0].pageY - startY) / 5.0

          let delta = {
            left: x,
            top: y,
            x,
          y}

          let output = assign({}, e, {delta})
          return output
        })
        .takeUntil(touchEnd$)
    })
}

function dragMoves ({mouseDowns$, mouseUps$, mouseMoves$, touchStart$, touchEnd$, longTaps$, touchMoves$}, longPressDelay, deltaSqr) {
  // drag move interactions (continuously firing)
  const dragMoves$ = merge(
    mouseDrags(mouseDowns$, mouseUps$, mouseMoves$, longPressDelay, deltaSqr),
    touchDrags(touchStart$, touchEnd$, touchMoves$)
  )
    .takeUntil(longTaps$)//.repeat() // no drag moves if there is a context action already taking place

  return dragMoves$
}

/* alternative "clicks" (ie mouseDown -> mouseUp ) implementation, with more fine
grained control*/
function baseTaps ({mouseDowns$, mouseUps$, mouseMoves$, touchStart$, touchEnd$, touchMoves$}, settings) {
  const {deltaSqr} = settings

  const starts$ = merge(mouseDowns$, touchStart$) // mouse & touch interactions starts
  const ends$ = merge(mouseUps$, touchEnd$) // mouse & touch interactions ends
  const moves$ = merge(mouseMoves$, touchMoves$)
  // only doing any "clicks if the time between mDOWN and mUP is below longpressDelay"
  // any small mouseMove is ignored (shaky hands)
  return starts$
    .flatMap(function (downEvent) {
      // let target = downEvent.currentTarget
      return merge(
        moves$ // Skip if we get a movement before a mouse up
          .filter(data => isMoving(data.delta, deltaSqr)) // allow for small movement (shaky hands!)
          .take(1).flatMap(x => empty()).timestamp(),
        ends$.take(1).timestamp()
      )//.switch()


      /*
      return most.switch(//Rx.Observable.amb(
        [
          moves$ // Skip if we get a movement before a mouse up
            .filter(data => isMoving(data.delta, deltaSqr)) // allow for small movement (shaky hands!)
            .take(1).flatMap(x => empty()).timestamp(),
          ends$.take(1).timestamp()
        ])*/
    }).multicast()
}

function taps (baseInteractions, settings) {
  const taps$ = baseTaps(baseInteractions, settings)
  const {longPressDelay, multiClickDelay} = settings

  const shortTaps$ = taps$
    .filter(e => e.interval <= longPressDelay)
    .map(e => e.value)
    .filter(event => ('button' in event && event.button === 0)) // FIXME : bad filter !
    //.buffer(function () { return taps$.debounce(multiClickDelay) })
    .map(list => ({list: list, nb: list.length}))
    .multicast()

  const shortSingleTaps$ = shortTaps$.filter(x => x.nb === 1).flatMap(e => e.list)
  const shortDoubleTaps$ = shortTaps$.filter(x => x.nb === 2).flatMap(e => e.list).take(1)//.repeat()

  // longTaps: either HELD leftmouse/pointer or HELD right click
  // FIXME : needs to be "UNTIL" mouseUp
  // and not fire before mouseUp
  const longTaps$ = taps$.filter(e => e.interval > longPressDelay)
    .map(e => e.value)

  return {
    taps$,
    shortSingleTaps$,
    shortDoubleTaps$,
    longTaps$
  }
}

export function pointerGestures (baseInteractions) {
  const multiClickDelay = 250
  const longPressDelay = 250
  const minDelta = 25 // max 50 pixels delta
  const deltaSqr = (minDelta * minDelta)

  const settings = {multiClickDelay, longPressDelay, deltaSqr}

  const taps$ = taps(baseInteractions, settings)
  const dragMoves$ = dragMoves(assign({}, baseInteractions, taps$), settings)

  return {taps: taps$, dragMoves: dragMoves$}
}
