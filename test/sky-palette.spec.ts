import { describe, it, expect } from 'vitest'
import { Color } from 'three'
import { coronaColor } from '~/utils/sky/palette'

const brightness = (c: Color) => c.r + c.g + c.b

describe('coronaColor', () => {
  // The eclipsed sun's corona says how deep the sun has sunk: blue through
  // blue hour, indigo into the night, and fainter the deeper it goes.
  it('is the blue-hour cyan at −6°', () => {
    const blue = new Color('#8cc0e6')
    const strength = coronaColor(-6).r / blue.r
    const c = coronaColor(-6).multiplyScalar(1 / strength)
    expect(c.r).toBeCloseTo(blue.r, 6)
    expect(c.g).toBeCloseTo(blue.g, 6)
    expect(c.b).toBeCloseTo(blue.b, 6)
  })

  it('fades as the sun sinks, and stops fading once night is full', () => {
    expect(brightness(coronaColor(-2))).toBeGreaterThan(brightness(coronaColor(-10)))
    expect(brightness(coronaColor(-10))).toBeGreaterThan(brightness(coronaColor(-18)))
    expect(brightness(coronaColor(-40))).toBeCloseTo(brightness(coronaColor(-18)), 6)
  })

  it('never goes dark: a sun deep in the night is still found', () => {
    expect(brightness(coronaColor(-60))).toBeGreaterThan(0.2)
  })

  it('turns from cyan to indigo: bluer than it is green deep in the night', () => {
    const night = coronaColor(-15)
    expect(night.b).toBeGreaterThan(night.g * 1.4)
  })
})
