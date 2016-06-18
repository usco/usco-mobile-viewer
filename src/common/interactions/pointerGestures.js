import most from 'most'
import { fromEvent, merge, empty, continueWith } from 'most'
import assign from 'fast.js/object/assign' // faster object.assign
import { isMoving, normalizeWheel } from './utils'

// //////FOr most.js
const repeat = (n, stream) => n === 0 ? empty()
  : n === 1 ? stream
    : continueWith(() => repeat(n - 1, stream), stream)

// this is in another package/module normally
export function preventDefault (event) {
  event.preventDefault()
  return event
}
export function interactionsFromEvents (targetEl) {
  let mouseDowns$ = fromEvent('mousedown', targetEl)
  let mouseUps$ = fromEvent('mouseup', targetEl)
  let mouseLeaves$ = fromEvent('mouseleave', targetEl).merge(fromEvent('mouseout', targetEl))
  let mouseMoves$ = fromEvent('mousemove', targetEl).takeUntil(mouseLeaves$) // altMouseMoves(fromEvent(targetEl, 'mousemove')).takeUntil(mouseLeaves$)

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
function mouseDrags (mouseDowns$, mouseUps, mouseMoves, longPressDelay = 250 , maxStaticDeltaSqr) {
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
        return {mouseEvent: e, delta}
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

          // let output = assign({}, e, {delta})
          return {mouseEvent: e, delta}
        })
        .takeUntil(touchEnd$)
    })
}

/* drag move interactions press & move(continuously firing)
*/
function dragMoves ({mouseDowns$, mouseUps$, mouseMoves$, touchStart$, touchEnd$, longTaps$, touchMoves$}, settings) {
  const {longPressDelay, maxStaticDeltaSqr} = settings
  const dragMoves$ = merge(
    mouseDrags(mouseDowns$, mouseUps$, mouseMoves$, longPressDelay, maxStaticDeltaSqr),
    touchDrags(touchStart$, touchEnd$, touchMoves$, longPressDelay, maxStaticDeltaSqr)
  )
  // .takeUntil(longTaps$) // .repeat() // no drag moves if there is a context action already taking place

  return dragMoves$
}

/* alternative "clicks" (ie mouseDown -> mouseUp ) implementation, with more fine
grained control*/
function baseTaps ({mouseDowns$, mouseUps$, mouseMoves$, touchStart$, touchEnd$, touchMoves$}, settings) {
  const {maxStaticDeltaSqr} = settings

  const starts$ = merge(mouseDowns$, touchStart$) // mouse & touch interactions starts
  const ends$ = merge(mouseUps$, touchEnd$) // mouse & touch interactions ends
  const moves$ = merge(mouseMoves$, touchMoves$)
  // only doing any "clicks if the time between mDOWN and mUP is below longpressDelay"
  // any small mouseMove is ignored (shaky hands)

  return starts$
    .timestamp()
    .flatMap(function (downEvent) {
      return merge(
        most.of(downEvent),
        moves$ // Skip if we get a movement before a mouse up
          .tap(e => console.log('e.delta', e))
          .filter(data => isMoving(data.delta, maxStaticDeltaSqr)) // allow for small movement (shaky hands!) FIXME: implement
          .take(1).flatMap(x => empty()).timestamp(),
        ends$.take(1).timestamp()
      )
    })
    .loop(function (acc, current) {
      let result
      if (acc.length === 1) {
        const interval = current.time - acc[0].time
        let moveDelta = [current.value.clientX - acc[0].value.offsetX, current.value.clientY - acc[0].value.offsetY] // FIXME: duplicate of mouseDrags !
        moveDelta = moveDelta[0] * moveDelta[0] + moveDelta[1] * moveDelta[1] // squared distance
        result = {value: current.value, interval, moveDelta}
        acc = []
      } else {
        acc.push(current)
      }
      return {seed: acc, value: result}
    }, [])
    .filter(e => e !== undefined)
    .multicast()
}

function taps (baseInteractions, settings) {
  const taps$ = baseTaps(baseInteractions, settings)
  const {longPressDelay, multiClickDelay, maxStaticDeltaSqr} = settings

  function bufferUntil (obsToBuffer, obsEnd) {
    return obsToBuffer
      .map(data => ({type: 'data', data}))
      .merge(taps$.debounce(multiClickDelay).map(data => ({type: 'reset'})))
      .loop(function (seed, {type, data}) {
        let value
        if (type === 'data') {
          seed.push(data)
        } else {
          value = seed
          seed = []
        }
        return {seed, value}
      }, [])
      .filter(x => x !== undefined)

  /*const baseBuffer$ =
    obsToBuffer.scan(function (acc, current) {
      acc.push(current)
      return acc
  }, [])

  return baseBuffer$
    .until(obsEnd)*/
  }

  const shortTaps$ = taps$
    .filter(e => e.interval <= longPressDelay) // any tap shorter than this time is a short one
    .filter(e => e.moveDelta < maxStaticDeltaSqr) // when the square distance is bigger than this, it is a movement, not a tap
    .map(e => e.value)
    .filter(event => ('button' in event && event.button === 0)) // FIXME : bad filter , excludes mobile ?!

    .map(data => ({type: 'data', data}))
    .merge(taps$.debounce(multiClickDelay).map(data => ({type: 'reset'})))
    .loop(function (seed, {type, data}) {
      let value
      if (type === 'data') {
        seed.push(data)
      } else {
        value = seed
        seed = []
      }
      return {seed, value}
    }, [])
    .filter(x => x !== undefined)
    // .buffer(function () { return taps$.debounce(multiClickDelay) })// buffer all inputs, and emit at then end of multiClickDelay
    .map(list => ({list: list, nb: list.length}))
    .multicast()

  const shortSingleTaps$ = shortTaps$.filter(x => x.nb === 1).map(e => e.list) // was flatMap
  const shortDoubleTaps$ = shortTaps$.filter(x => x.nb === 2).map(e => e.list) // .take(1) // .repeat()

  // longTaps: either HELD leftmouse/pointer or HELD right click
  const longTaps$ = taps$
    .filter(e => e.interval > longPressDelay)
    .filter(e => e.moveDelta < maxStaticDeltaSqr) // when the square distance is bigger than this, it is a movement, not a tap
    .map(e => e.value)

  return {
    taps$,
    shortSingleTaps$,
    shortDoubleTaps$,
  longTaps$}
}

export function pointerGestures (baseInteractions) {
  const multiClickDelay = 250
  const longPressDelay = 250
  const maxStaticDeltaSqr = 100 // max 100 pixels delta

  const settings = {multiClickDelay, longPressDelay, maxStaticDeltaSqr}

  const taps$ = taps(baseInteractions, settings)
  const dragMoves$ = dragMoves(baseInteractions, settings)

  return {taps: taps$, dragMoves: dragMoves$, zooms: baseInteractions.zooms$}
}
