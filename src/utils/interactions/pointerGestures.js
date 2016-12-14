import { just, map, filter, fromEvent, merge, empty, continueWith } from 'most'
import { curry2, compose } from '@most/prelude'
import assign from 'fast.js/object/assign' // faster object.assign
import { isMoving, normalizeWheel } from './utils'

// //////FOr most.js
const repeat = (n, stream) => n === 0 ? empty()
  : n === 1 ? stream
    : continueWith(() => repeat(n - 1, stream), stream)

// see https://github.com/cujojs/most/issues/20

// Imagine map and filter are curried
const mapc = curry2(map)
const filterc = curry2(filter)

// this is in another package/module normally
export function preventDefault (event) {
  event.preventDefault()
  return event
}

// for gesture vs touch events
function isNotIos (event) {
  const ios = /iphone|ipod|ipad/.test(window.navigator.userAgent.toLowerCase())
  return ios === false
}

export function interactionsFromEvents (targetEl) {
  const mouseDowns$ = fromEvent('mousedown', targetEl)
  const mouseUps$ = fromEvent('mouseup', targetEl)
  const mouseLeaves$ = fromEvent('mouseleave', targetEl).merge(fromEvent('mouseout', targetEl))
  const mouseMoves$ = fromEvent('mousemove', targetEl) // .takeUntil(mouseLeaves$) // altMouseMoves(fromEvent(targetEl, 'mousemove')).takeUntil(mouseLeaves$)

  const rightClicks$ = fromEvent('contextmenu', targetEl).tap(preventDefault) // disable the context menu / right click

  const touchStart$ = fromEvent('touchstart', targetEl)
  const touchMoves$ = fromEvent('touchmove', targetEl).filter(t => t.touches.length === 1)
  const touchEnd$ = fromEvent('touchend', targetEl)

  // const gestureChange$ = fromEvent('gesturechange', targetEl)
  // const gestureStart$ = fromEvent('gesturestart', targetEl)
  // const gestureEnd$ = fromEvent('gestureend', targetEl)

  const pointerDowns$ = merge(mouseDowns$, touchStart$) // mouse & touch interactions starts
  const pointerUps$ = merge(mouseUps$, touchEnd$) // mouse & touch interactions ends
  const pointerMoves$ = merge(mouseMoves$, touchMoves$)

  const zooms$ = merge(
    merge(
      // pinchZooms(gestureChange$, gestureStart$, gestureEnd$),// for Ios
      pinchZoomsFromTouch(touchStart$, fromEvent('touchmove', targetEl), touchEnd$) // for Android (no gestureXX events)
    ),

    merge(
      fromEvent('wheel', targetEl),
      fromEvent('DOMMouseScroll', targetEl),
      fromEvent('mousewheel', targetEl)
    ).map(normalizeWheel)
  )

  function preventScroll (targetEl) {
    fromEvent('mousewheel', targetEl).forEach(preventDefault)
    fromEvent('DOMMouseScroll', targetEl).forEach(preventDefault)
    fromEvent('wheel', targetEl).forEach(preventDefault)
    fromEvent('touchmove', targetEl).forEach(preventDefault)
  }
  preventScroll(targetEl)

  return {
    mouseDowns$,
    mouseUps$,
    mouseMoves$,

    rightClicks$,
    zooms$,

    touchStart$,
    touchMoves$,
    touchEnd$,

    pointerDowns$,
    pointerUps$,
  pointerMoves$}
}

function gestureStart () {
}

// based on http://jsfiddle.net/mattpodwysocki/pfCqq/
function mouseDrags (mouseDowns$, mouseUps, mouseMoves, settings) {
  const {longPressDelay, maxStaticDeltaSqr} = settings
  return mouseDowns$.flatMap(function (md) {
    // calculate offsets when mouse down
    let startX = md.offsetX * window.devicePixelRatio
    let startY = md.offsetY * window.devicePixelRatio
    // Calculate delta with mousemove until mouseup
    let prevX = startX
    let prevY = startY

    return mouseMoves
      .map(function (e) {
        let curX = e.clientX * window.devicePixelRatio
        let curY = e.clientY * window.devicePixelRatio

        let delta = {
          left: curX - startX,
          top: curY - startY,
          x: prevX - curX,
          y: curY - prevY
        }

        prevX = curX
        prevY = curY

        const normalized = {x: curX, y: curY}
        return {mouseEvent: e, delta, normalized, type: 'mouse'}
      })
      .takeUntil(mouseUps)
  })
}

function touchDrags (touchStart$, touchEnd$, touchMove$, settings) {
  return touchStart$
    .flatMap(function (ts) {
      let startX = ts.touches[0].pageX * window.devicePixelRatio
      let startY = ts.touches[0].pageY * window.devicePixelRatio

      let prevX = startX
      let prevY = startY

      return touchMove$
        .map(function (e) {
          let curX = e.touches[0].pageX * window.devicePixelRatio
          let curY = e.touches[0].pageY * window.devicePixelRatio

          let x = (curX - startX)
          let y = (curY - startY)

          let delta = {
            left: x,
            top: y,
            x: (prevX - curX),
            y: (curY - prevY)
          }

          prevX = curX
          prevY = curY

          // let output = assign({}, e, {delta})
          const normalized = {x: curX, y: curY}
          return {mouseEvent: e, delta, normalized, type: 'touch'}
        })
        .takeUntil(touchEnd$)
    })
}

function pinchZooms (gestureChange$, gestureStart$, gestureEnd$) {
  return gestureStart$
    .flatMap(function (gs) {
      return gestureChange$
        .map(x => x.scale)
        // .loop((prev, cur) => ({seed: cur, value: prev ? cur - prev : prev}), undefined)
        .loop(function (prev, cur) {
          console.log('prev', prev, 'cur', cur, 'value', prev ? cur - prev : prev)
          let value = prev ? cur - prev : prev

          if (value > 0) {
            value = Math.min(Math.max(value, 0), 2)
          } else {
            value = Math.min(Math.max(value, 2), 0)
          }

          return {seed: cur, value}
        }, undefined)
        .filter(x => x !== undefined)
        // .map(x => x / x)
        .takeUntil(gestureEnd$)
    }).tap(e => console.log('pinchZooms', e))
}

function pinchZoomsFromTouch (touchStart$, touchMoves$, touchEnd$) {
  const threshold = 0 // The minimum amount in pixels the inputs must move until it is fired.
  // generic custom gesture handling
  // very very vaguely based on http://stackoverflow.com/questions/11183174/simplest-way-to-detect-a-pinch
  return touchStart$
    .filter(t => t.touches.length === 2)
    .flatMap(function (ts) {
      let startX1 = ts.touches[0].pageX //* window.devicePixelRatio
      let startY1 = ts.touches[0].pageY //* window.devicePixelRatio

      let startX2 = ts.touches[1].pageX //* window.devicePixelRatio
      let startY2 = ts.touches[1].pageY //* window.devicePixelRatio

      const startDist = ((startX1 - startX2) * (startX1 - startX2)) + ((startY1 - startY2) * (startY1 - startY2))
      const startPivot = [(startX1 - startX2) * 0.5 + startX2, (startY1 - startY2) * 0.5 + startY2]

      let curDist = startDist
      let prevdiff
      let saveDist = 0

      return touchMoves$
        .tap(e => e.preventDefault())
        .filter(t => t.touches.length === 2)
        .map(function (e) {
          let curX1 = e.touches[0].pageX //* window.devicePixelRatio
          let curY1 = e.touches[0].pageY //* window.devicePixelRatio

          let curX2 = e.touches[1].pageX //* window.devicePixelRatio
          let curY2 = e.touches[1].pageY //* window.devicePixelRatio

          const currentDist = ((curX1 - curX2) * (curX1 - curX2)) + ((curY1 - curY2) * (curY1 - curY2))
          const currentPivot = [(curX1 - curX2) * 0.5 + curX2, (curY1 - curY2) * 0.5 + curY2]

          let diff = currentDist - startDist // (currentDist - startDist) / (window.devicePixelRatio * window.devicePixelRatio)
          let offset
          if (Math.abs(diff) > threshold) {
            curDist = currentDist - saveDist

            //did we move the pivot a lot ?
            /*offset = ((currentPivot[0] - startPivot[0]) * (currentPivot[0] - startPivot[0]))
              + ((currentPivot[1] - startPivot[1]) * (currentPivot[1] - startPivot[1]))
            if(offset >1000){
              diff= undefined
            }*/
            if(Math.abs(prevdiff -diff) < 100 ){
              diff = undefined
            }
            prevdiff = diff

          } else {
            diff= undefined
          }
          const debugEl = document.getElementById('debug')
          //debugEl.innerHTML = `start: [${startPivot[0]}, ${startPivot[1]}], cur: [${currentPivot[0]}, ${currentPivot[1]}], `
          debugEl.innerHTML = `cur1: ${curX1}, ${curY1} ${curX2}, ${curY2}/n
          [${currentPivot[0]}, ${currentPivot[1]}]
          `

          //FIXME: there was a touchmove, diff is the same (ie difference between current distance between fingers and start distance )
          //FIXME: also do we need relative or absolute zoom ?
          //debugEl.innerHTML = `diff: ${diff} start: ${startDist}, current: ${curDist}, offset ${offset}`
          return diff
        // return {dist: currentDist, pivot: currentPivot}
        })
        .filter(x => x !== undefined)
        // .filter(diff => Math.abs(diff) > threshold)
        .map(function (diff) {
          // const diff = (curDist - startDist) / (window.devicePixelRatio * window.devicePixelRatio)

          return diff
        })
        .map(x => x * 0.0000005) // arbitrary, in order to harmonise desktop /mobile up to a point
        /*.map(function (e) {
          const scale = e > 0 ? Math.sqrt(e) : -Math.sqrt(Math.abs(e))
          return scale
        })*/
        .takeUntil(touchEnd$)
    })
}

/* drag move interactions press & move(continuously firing)
*/
function dragMoves ({mouseDowns$, mouseUps$, mouseMoves$, touchStart$, touchEnd$, longTaps$, touchMoves$}, settings) {
  const dragMoves$ = merge(
    mouseDrags(mouseDowns$, mouseUps$, mouseMoves$, settings),
    touchDrags(touchStart$, touchEnd$, touchMoves$, settings)
  )
  // .merge(merge(touchEnd$, mouseUps$).map(undefined))
  // .tap(e=>console.log('dragMoves',e))

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
        just(downEvent),
        moves$ // Skip if we get a movement before a mouse up
          .tap(e => console.log('e.delta', JSON.stringify(e)))
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
  /*
  // exploring of more composition based system : much clearer, but needs work

  const deltaBelowMax = x => x.moveDelta < maxStaticDeltaSqr
  const intervalBelowLongPress = x => x.interval <= longPressDelay
  const validButton = event => 'button' in event && event.button === 0
  const exists = x => x !== undefined

  const pluckValue = x => x.value
  const pluckList = x => x.list
  const first = x => x[0]

  const shortTaps = compose(
    filterc(deltaBelowMax),
    filterc(intervalBelowLongPress),
    mapc(pluckValue),
    filterc(validButton)
  )

  const firstInList = compose(
    mapc(pluckList),
    mapc(first)
  )

  //const tapsByNumber = tapCount => compose(filterc(x => x.nb === tapCount), firstInList())*/

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

  const shortSingleTaps$ = shortTaps$.filter(x => x.nb === 1).map(e => e.list).map(e => e[0]) // was flatMap
  const shortDoubleTaps$ = shortTaps$.filter(x => x.nb === 2).map(e => e.list).map(e => e[0]) // .take(1) // .repeat()

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
  const zoomMultiplier = 200 // zoomFactor for normalized interactions across browsers

  const settings = {multiClickDelay, longPressDelay, maxStaticDeltaSqr}

  const taps$ = taps(baseInteractions, settings)
  const dragMoves$ = dragMoves(baseInteractions, settings)

  return {
    taps: taps$,
    dragMoves: dragMoves$,
    zooms: baseInteractions.zooms$.map(x => x * zoomMultiplier),
    pointerMoves: baseInteractions.pointerMoves$
  }
}
