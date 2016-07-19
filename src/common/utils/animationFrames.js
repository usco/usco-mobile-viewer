//taken from https://github.com/briancavalier/most-behavior/blob/2888b2b69fe2c8e44617c611eb5fdaf512d52007/src/animationFrames.js
import { Stream } from 'most'

/* global requestAnimationFrame, cancelAnimationFrame */

export default () => new Stream(new AnimationFramesSource())

const recurse = (cancel, schedule) => (sink, scheduler) => {
  let canceler = new Cancel(cancel)
  const onNext = x => {
    sink.event(scheduler.now(), x)
    cancel.key = schedule(onNext)
  }
  cancel.key = schedule(onNext)

  return canceler
}

const animationFrames = recurse(cancelAnimationFrame, requestAnimationFrame)

class AnimationFramesSource {
  run (sink, scheduler) {
    return animationFrames(sink, scheduler)
  }
}

class Cancel {
  constructor (cancel) {
    this.cancel = cancel
    this.key = undefined
  }
  dispose () {
    this.cancel(this.key)
  }
}
