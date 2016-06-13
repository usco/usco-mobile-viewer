import {fromEvent} from 'most'

//this is in another package/module normally
export function preventDefault (event) {
  event.preventDefault()
  return event
}
export function interactionsFromEvents (targetEl) {
  let mouseDowns$ = fromEvent(targetEl, 'mousedown')
  let mouseUps$ = fromEvent(targetEl, 'mouseup')
  let mouseLeaves$ = fromEvent(targetEl, 'mouseleave').merge(fromEvent(targetEl, 'mouseout'))
  let mouseMoves$ = altMouseMoves(fromEvent(targetEl, 'mousemove')).takeUntil(mouseLeaves$)
  let rightClicks$ = fromEvent(targetEl, 'contextmenu').do(preventDefault) // disable the context menu / right click
  let zooms$ = fromEvent(targetEl, 'wheel')

  let touchStart$ = fromEvent('touchstart') // dom.touchstart(window)
  let touchMove$ = fromEvent('touchmove') // dom.touchmove(window)
  let touchEnd$ = fromEvent('touchend') // dom.touchend(window)

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
