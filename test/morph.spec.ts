import { describe, it, expect } from 'vitest'
import { Morph } from '~/utils/sky/morph'

describe('Morph', () => {
  it('retarget then apply moves linearly', () => {
    const m = new Morph(2)
    m.retarget([10, -10])
    m.apply(0.25)
    expect(Array.from(m.current)).toEqual([2.5, -2.5])
    m.apply(1)
    expect(Array.from(m.current)).toEqual([10, -10])
  })

  it('aim mid-run does not jump and lands on the new target', () => {
    const m = new Morph(1)
    m.retarget([10])
    m.apply(0.5)
    const before = m.current[0]!
    m.aim([20])
    m.apply(0.5)
    // The value changes only by the target delta times p.
    expect(m.current[0]! - before).toBeCloseTo(10 * 0.5, 5)
    m.apply(1)
    expect(m.current[0]).toBe(20)
  })

  it('aim when idle equals retarget', () => {
    const a = new Morph(2)
    const b = new Morph(2)
    a.retarget([4, 8])
    a.apply(1)
    b.retarget([4, 8])
    b.apply(1)
    a.aim([6, 2])
    b.retarget([6, 2])
    a.apply(0.5)
    b.apply(0.5)
    expect(Array.from(a.current)).toEqual(Array.from(b.current))
    a.apply(1)
    expect(Array.from(a.current)).toEqual([6, 2])
  })
})
