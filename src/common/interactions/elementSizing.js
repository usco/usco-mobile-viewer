import { fromEvent } from 'most'

// element resize event stream, throttled by throttle amount (250ms default)
export function elementSize (element, throttle = 250) {
  function extractSize (x) {
    x = x.target
    const bRect = x.getBoundingClientRect ? x.getBoundingClientRect() : { left: 0, top: 0, bottom: 0, right: 0, width: 0, height: 0 }
    return {width: x.innerWidth, height: x.innerHeight, aspect: x.innerWidth / x.innerHeight, bRect}
  }

  return fromEvent('resize', element)
    .throttle(throttle /* ms */)
    .map(extractSize)
    //.startWith({width: element.innerWidth, height: element.innerHeight, aspect: element.innerWidth / element.innerHeight, bRect: undefined})
}
