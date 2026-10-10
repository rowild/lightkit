/**
 * Morph buffers: typed arrays that glide from where they are to where they
 * should be. The bow, the beads, the sun and the labels all move this way, so
 * a bow switch, a new place and the live sun share one mechanism (spec 8).
 */
import gsap from 'gsap'

export class Morph {
  readonly current: Float32Array
  private readonly from: Float32Array
  private readonly to: Float32Array
  private moving = false

  constructor(length: number) {
    this.current = new Float32Array(length)
    this.from = new Float32Array(length)
    this.to = new Float32Array(length)
  }

  /** Aim at `target`, starting from wherever the values are now. */
  retarget(target: ArrayLike<number>) {
    this.from.set(this.current)
    this.to.set(target)
    this.moving = true
  }

  /** Move to `progress` (0–1) of the way. A morph with no target stays put. */
  apply(progress: number) {
    if (!this.moving) return
    const { current, from, to } = this
    for (let i = 0; i < current.length; i++) current[i] = from[i]! + (to[i]! - from[i]!) * progress
    if (progress >= 1) this.moving = false
  }
}

/**
 * Drives a set of morphs through one eased progress value. A new run starts
 * from wherever the values are, so a change in mid-glide never jumps back.
 */
export const createMorphRunner = (morphs: Morph[], onFrame: () => void) => {
  const state = { progress: 1 }
  let tween: gsap.core.Tween | null = null
  return {
    get running() {
      return tween !== null
    },
    /** Call after retargeting. A duration of 0 arrives at once. */
    run(duration: number, onDone?: () => void) {
      tween?.kill()
      tween = null
      if (duration <= 0) {
        for (const morph of morphs) morph.apply(1)
        onFrame()
        onDone?.()
        return
      }
      state.progress = 0
      tween = gsap.to(state, {
        progress: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          for (const morph of morphs) morph.apply(state.progress)
          onFrame()
        },
        onComplete: () => {
          tween = null
          onDone?.()
        }
      })
    },
    kill() {
      tween?.kill()
      tween = null
    }
  }
}
