import { describe, it, expect } from 'vitest'
import {
  apertures,
  apertureLabel,
  stopsBetween,
  apertureAfterStops,
  nearestAperture,
  apertureTrim,
  wholeStopApertureIndices,
  labelledApertureIndices
} from '~/utils/aperture'

describe('apertures', () => {
  it('runs from widest to narrowest', () => {
    const sorted = [...apertures].sort((a, b) => a - b)
    expect(apertures).toEqual(sorted)
  })

  // The entries are marketed labels, not exact powers of the square root of
  // two, so label-to-label gaps are uneven: f/11 to f/13 is 0.48 stops and
  // f/13 to f/14 is 0.21. Asserting a tight per-step tolerance would only
  // assert that the series had been falsified. What matters is that it never
  // goes backwards, never jumps a whole stop, and spans the right total.
  it('always moves forward, and never by a whole stop', () => {
    for (let i = 1; i < apertures.length; i++) {
      const step = stopsBetween(apertures[i - 1]!, apertures[i]!)
      expect(step).toBeGreaterThan(0)
      expect(step).toBeLessThan(0.5)
    }
  })

  it('spans eight stops, which is 24 third-stop steps', () => {
    expect(apertures).toHaveLength(25)
    // 7.948, not 8.000. The 0.05 is the rounding in the printed labels adding
    // up across the whole series, and it is the price of matching what a lens
    // barrel says rather than what the arithmetic says.
    const span = stopsBetween(apertures[0]!, apertures[apertures.length - 1]!)
    expect(Math.abs(span - 8)).toBeLessThan(0.1)
  })

  it('contains the full stops', () => {
    for (const full of [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22]) {
      expect(apertures).toContain(full)
    }
  })
})

describe('apertureLabel', () => {
  it('prints one decimal below f/10', () => {
    expect(apertureLabel(2)).toBe('f/2.0')
    expect(apertureLabel(5.6)).toBe('f/5.6')
  })

  it('prints whole numbers from f/10 up', () => {
    expect(apertureLabel(10)).toBe('f/10')
    expect(apertureLabel(22)).toBe('f/22')
  })
})

describe('stopsBetween', () => {
  it('counts one stop across a full-stop pair', () => {
    expect(stopsBetween(2.8, 4)).toBeCloseTo(1, 1)
    expect(stopsBetween(4, 5.6)).toBeCloseTo(1, 1)
  })

  it('is negative when the target is wider', () => {
    expect(stopsBetween(4, 2.8)).toBeCloseTo(-1, 1)
  })

  it('is zero for the same aperture', () => {
    expect(stopsBetween(4, 4)).toBe(0)
  })
})

describe('apertureAfterStops', () => {
  it('closes the iris for positive stops', () => {
    expect(apertureAfterStops(2.8, 1)).toBeCloseTo(3.96, 1)
  })

  it('opens the iris for negative stops', () => {
    expect(apertureAfterStops(4, -1)).toBeCloseTo(2.83, 1)
  })

  it('round-trips with stopsBetween', () => {
    const moved = apertureAfterStops(3.5, 1.7)
    expect(stopsBetween(3.5, moved)).toBeCloseTo(1.7, 10)
  })
})

describe('nearestAperture', () => {
  it('returns an exact member unchanged', () => {
    expect(nearestAperture(5.6)).toEqual({ fNumber: 5.6, index: apertures.indexOf(5.6) })
  })

  it('snaps in stop space, not linear space', () => {
    // 3.13 sits 0.32 stops from f/2.8 but only 0.06 from f/3.2.
    expect(nearestAperture(3.13).fNumber).toBe(3.2)
  })

  it('clamps below the series', () => {
    expect(nearestAperture(0.9).fNumber).toBe(1.4)
  })

  it('clamps above the series', () => {
    expect(nearestAperture(40).fNumber).toBe(22)
  })
})

describe('apertureTrim', () => {
  it('closes the iris when the filter is too weak', () => {
    // needed 2.32 stops, ND4 gives 2, so residual is -0.32.
    const trim = apertureTrim(2.8, -0.3219)
    expect(trim.fNumber).toBe(3.2)
    expect(trim.stops).toBeGreaterThan(0)
    expect(Math.abs(trim.leftoverStops)).toBeLessThan(0.1)
    expect(trim.clamped).toBe(false)
  })

  it('opens the iris when the filter is too strong', () => {
    const trim = apertureTrim(4, 0.5)
    expect(trim.fNumber).toBeLessThan(4)
    expect(trim.stops).toBeLessThan(0)
  })

  it('leaves the aperture alone when the filter is spot on', () => {
    const trim = apertureTrim(4, 0)
    expect(trim.fNumber).toBe(4)
    expect(trim.stops).toBe(0)
    expect(trim.leftoverStops).toBe(0)
  })

  it('reports a clamp when the ideal falls off the series', () => {
    // Nine stops of opening from f/1.4 is far below anything that exists.
    expect(apertureTrim(1.4, 9).clamped).toBe(true)
    expect(apertureTrim(1.4, 9).fNumber).toBe(1.4)
  })

  it('reports leftover honestly after snapping', () => {
    const trim = apertureTrim(2.8, -0.3219)
    // filter residual plus the trim actually achieved
    expect(trim.leftoverStops).toBeCloseTo(-0.3219 + trim.stops, 10)
  })
})

describe('wholeStopApertureIndices', () => {
  it('picks out the full stops every photographer knows', () => {
    expect(wholeStopApertureIndices.map(i => apertures[i]))
      .toEqual([1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22])
  })

  it('steps by one stop each time, within the rounding of the labels', () => {
    for (let i = 1; i < wholeStopApertureIndices.length; i++) {
      const a = apertures[wholeStopApertureIndices[i - 1]!]!
      const b = apertures[wholeStopApertureIndices[i]!]!
      expect(Math.abs(stopsBetween(a, b) - 1)).toBeLessThan(0.1)
    }
  })
})

describe('labelledApertureIndices', () => {
  it('prints the five f-numbers off a lens barrel', () => {
    expect(labelledApertureIndices.map(i => apertures[i])).toEqual([1.4, 2.8, 5.6, 11, 22])
  })

  it('is a subset of the whole-stop marks', () => {
    for (const index of labelledApertureIndices) {
      expect(wholeStopApertureIndices).toContain(index)
    }
  })
})
