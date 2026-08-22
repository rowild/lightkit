import { describe, it, expect } from 'vitest'
import {
  shutterSpeeds,
  ndFilters,
  formatExposure,
  calculateExposure,
  getSpeedIndex,
  shutterFromFrameRate,
  frameRates,
  requiredStops,
  nearestFilter,
  filterOutcomes,
  describeOffset,
  wholeStopShutterIndices,
  labelledShutterIndices
} from '~/utils/nd'

describe('shutterSpeeds', () => {
  it('runs from fastest to slowest', () => {
    const values = shutterSpeeds.map(s => s.value)
    const sorted = [...values].sort((a, b) => a - b)
    expect(values).toEqual(sorted)
  })

  it('gives every entry a label ending in " s"', () => {
    for (const speed of shutterSpeeds) {
      expect(speed.label.endsWith(' s')).toBe(true)
    }
  })
})

describe('ndFilters', () => {
  it('covers one to ten stops with no gaps', () => {
    expect(ndFilters.map(f => f.stops)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('names each filter as the filter is sold', () => {
    // Ten stops is a factor of 1024, but every maker markets it as ND1000.
    expect(ndFilters.map(f => f.name)).toEqual([
      'ND2', 'ND4', 'ND8', 'ND16', 'ND32',
      'ND64', 'ND128', 'ND256', 'ND512', 'ND1000'
    ])
  })
})

describe('formatExposure', () => {
  it('renders sub-second times as a reciprocal', () => {
    expect(formatExposure(1 / 250)).toEqual({ label: '1/250 s', mathLabel: '1/250s' })
  })

  it('renders seconds with one decimal', () => {
    expect(formatExposure(2)).toEqual({ label: '2.0 s', mathLabel: '2.0s' })
  })

  it('renders one minute and over as minutes and seconds', () => {
    expect(formatExposure(90)).toEqual({ label: '1m 30s', mathLabel: '1m 30s' })
  })

  it('renders one hour and over as hours and minutes', () => {
    // 30 s base through a ten-stop filter is the slowest result the app can
    // produce. "512m 0s" is not a time anyone reads off a screen.
    expect(formatExposure(30720)).toEqual({ label: '8h 32m', mathLabel: '8h 32m' })
  })
})

describe('calculateExposure', () => {
  it('doubles the exposure time for every stop', () => {
    expect(calculateExposure(1 / 1000, 3).seconds).toBeCloseTo(1 / 125, 10)
  })

  it('returns the formatted labels alongside the raw seconds', () => {
    const result = calculateExposure(1 / 2000, 3)
    expect(result.label).toBe('1/250 s')
    expect(result.mathLabel).toBe('1/250s')
  })

  it('treats zero stops as no change', () => {
    expect(calculateExposure(1 / 60, 0).seconds).toBeCloseTo(1 / 60, 10)
  })
})

describe('getSpeedIndex', () => {
  it('finds an exact shutter value', () => {
    expect(shutterSpeeds[getSpeedIndex(1 / 250)]!.label).toBe('1/250 s')
  })

  it('falls back to 1/250 s for an unknown value', () => {
    // 1/3 s used to be a safe "not in the table" probe, but the 1/3-stop table
    // added below now carries 1/3 s as a real entry. 1/7 s is not in either table.
    expect(shutterSpeeds[getSpeedIndex(1 / 7)]!.label).toBe('1/250 s')
  })
})

describe('shutterSpeeds (1/3-stop table)', () => {
  it('includes the shutter speeds video actually uses', () => {
    // 1/50 is the 24 and 25 fps standard and was absent from the full-stop
    // table. Without it the user cannot enter what their aircraft displayed.
    const labels = shutterSpeeds.map(s => s.label)
    for (const needed of ['1/50 s', '1/100 s', '1/120 s', '1/200 s', '1/240 s']) {
      expect(labels).toContain(needed)
    }
  })

  it('runs from fastest to slowest with no duplicates', () => {
    const values = shutterSpeeds.map(s => s.value)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(new Set(values).size).toBe(values.length)
  })

  it('never leaves a gap wider than roughly a third of a stop', () => {
    // Only an upper bound. The table is not a clean 1/3-stop series: it also
    // carries the video values 1/120 and 1/240, which sit 0.06 stop from their
    // stills neighbours 1/125 and 1/250. A lower bound would reject those, and
    // the no-duplicates test above already catches a repeated entry.
    for (let i = 1; i < shutterSpeeds.length; i++) {
      const step = Math.log2(shutterSpeeds[i]!.value / shutterSpeeds[i - 1]!.value)
      expect(step).toBeGreaterThan(0)
      expect(step).toBeLessThan(0.45)
    }
  })

  it('gives every entry a distinct label', () => {
    // Two entries that print the same string are indistinguishable in the
    // picker, whatever their underlying values.
    const labels = shutterSpeeds.map(s => s.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('shutterFromFrameRate', () => {
  it('applies the 180-degree rule by default', () => {
    expect(shutterFromFrameRate(25)).toBeCloseTo(1 / 50, 10)
    expect(shutterFromFrameRate(60)).toBeCloseTo(1 / 120, 10)
  })

  it('halves the time at a 90-degree shutter angle', () => {
    expect(shutterFromFrameRate(25, 90)).toBeCloseTo(1 / 100, 10)
  })

  it('doubles the time at a 360-degree shutter angle', () => {
    expect(shutterFromFrameRate(25, 360)).toBeCloseTo(1 / 25, 10)
  })
})

describe('requiredStops', () => {
  it('measures how much light must be blocked to reach the target', () => {
    // 1/2000 s metered, 1/50 s wanted: the target is 40x longer, log2(40).
    expect(requiredStops(1 / 2000, 1 / 50)).toBeCloseTo(5.3219, 3)
  })

  it('returns a whole number when the gap is a whole number of stops', () => {
    expect(requiredStops(1 / 1000, 1 / 125)).toBeCloseTo(3, 10)
  })

  it('returns zero when the camera already meters the target', () => {
    expect(requiredStops(1 / 50, 1 / 50)).toBeCloseTo(0, 10)
  })

  it('goes negative when the target is faster than what was metered', () => {
    // The user needs more light, not less. No filter can do this.
    expect(requiredStops(1 / 50, 1 / 200)).toBeCloseTo(-2, 10)
  })
})

describe('nearestFilter', () => {
  it('picks the closest filter and reports how far off it is', () => {
    const match = nearestFilter(5.3219, ndFilters)!
    expect(match.filter.name).toBe('ND32')
    // ND32 is 5 stops, so it falls 0.3219 short of the requirement.
    expect(match.residualStops).toBeCloseTo(-0.3219, 3)
  })

  it('reports zero residual on an exact match', () => {
    const match = nearestFilter(6, ndFilters)!
    expect(match.filter.name).toBe('ND64')
    expect(match.residualStops).toBeCloseTo(0, 10)
  })

  it('breaks an exact tie towards the stronger filter', () => {
    // Too weak leaves the shutter faster than the target and the motion
    // choppy. Too strong only adds blur. Blur is the safer error.
    const match = nearestFilter(5.5, ndFilters)!
    expect(match.filter.name).toBe('ND64')
  })

  it('breaks a tie towards the stronger filter whatever order it is given', () => {
    // The caller owns the array, so the guarantee cannot depend on its order.
    const ascending = [{ name: 'ND32', stops: 5 }, { name: 'ND64', stops: 6 }]
    const descending = [{ name: 'ND64', stops: 6 }, { name: 'ND32', stops: 5 }]
    expect(nearestFilter(5.5, ascending)!.filter.name).toBe('ND64')
    expect(nearestFilter(5.5, descending)!.filter.name).toBe('ND64')
  })

  it('returns null when there are no filters to choose from', () => {
    expect(nearestFilter(5, [])).toBeNull()
  })

  it('never widens the search beyond the filters it was given', () => {
    const match = nearestFilter(9, [{ name: 'ND8', stops: 3 }])!
    expect(match.filter.name).toBe('ND8')
    expect(match.residualStops).toBeCloseTo(-6, 10)
  })
})

describe('filterOutcomes', () => {
  it('reports what every filter would give, in the order supplied', () => {
    const outcomes = filterOutcomes(1 / 2000, 1 / 50, ndFilters)
    expect(outcomes).toHaveLength(ndFilters.length)
    expect(outcomes.map(o => o.filter.name)).toEqual(ndFilters.map(f => f.name))
  })

  it('computes the resulting shutter for each filter', () => {
    const outcomes = filterOutcomes(1 / 2000, 1 / 50, ndFilters)
    const nd32 = outcomes.find(o => o.filter.name === 'ND32')!
    expect(nd32.seconds).toBeCloseTo(1 / 62.5, 10)
    expect(nd32.label).toBe('1/63 s')
  })

  it('says how far each filter lands from the target, in stops', () => {
    const outcomes = filterOutcomes(1 / 2000, 1 / 50, ndFilters)
    // ND32 gives 1/62.5 s against a 1/50 s target: still 0.32 stop too fast.
    expect(outcomes.find(o => o.filter.name === 'ND32')!.offsetStops).toBeCloseTo(-0.3219, 3)
    // ND64 overshoots into slower-than-target territory.
    expect(outcomes.find(o => o.filter.name === 'ND64')!.offsetStops).toBeCloseTo(0.6781, 3)
  })
})

describe('frameRates', () => {
  it('offers seven rates, so the dial ticks land 45 degrees apart', () => {
    expect(frameRates).toEqual([24, 25, 30, 50, 60, 120, 240])
  })

  it('gives 1/480 s for 240 fps at 180 degrees', () => {
    expect(shutterFromFrameRate(240)).toBeCloseTo(1 / 480, 10)
  })
})

describe('describeOffset', () => {
  it('calls anything under a tenth of a stop spot on', () => {
    expect(describeOffset(0.04)).toEqual({ amount: null, words: 'spot on' })
    expect(describeOffset(-0.04)).toEqual({ amount: null, words: 'spot on' })
  })

  it('says short when the filter is too weak', () => {
    expect(describeOffset(-0.3)).toEqual({ amount: '0.3', words: 'stops short' })
  })

  it('says over when the filter is too strong', () => {
    expect(describeOffset(1)).toEqual({ amount: '1.0', words: 'stop over' })
  })
})

describe('wholeStopShutterIndices', () => {
  it('starts at the fastest speed and ends at the slowest', () => {
    expect(wholeStopShutterIndices[0]).toBe(0)
    expect(wholeStopShutterIndices[wholeStopShutterIndices.length - 1]).toBe(shutterSpeeds.length - 1)
  })

  it('marks the speeds a photographer calls whole stops', () => {
    const labels = wholeStopShutterIndices.map(i => shutterSpeeds[i]!.label)
    expect(labels).toContain('1/1000 s')
    expect(labels).toContain('1/250 s')
    expect(labels).toContain('1/125 s')
    expect(labels).toContain('1/60 s')
    expect(labels).toContain('1/30 s')
    expect(labels).toContain('1.0 s')
  })

  it('does not mark the third-stops between them', () => {
    const labels = wholeStopShutterIndices.map(i => shutterSpeeds[i]!.label)
    for (const third of ['1/6400 s', '1/800 s', '1/320 s', '1/50 s', '1/40 s']) {
      expect(labels).not.toContain(third)
    }
  })

  it('steps by one stop each time, within the rounding of the labels', () => {
    for (let i = 1; i < wholeStopShutterIndices.length; i++) {
      const a = shutterSpeeds[wholeStopShutterIndices[i - 1]!]!.value
      const b = shutterSpeeds[wholeStopShutterIndices[i]!]!.value
      expect(Math.abs(Math.log2(b / a) - 1)).toBeLessThan(0.15)
    }
  })

  it('never repeats an index', () => {
    expect(new Set(wholeStopShutterIndices).size).toBe(wholeStopShutterIndices.length)
  })
})

describe('labelledShutterIndices', () => {
  it('prints seven numbers a photographer reads without thinking', () => {
    expect(labelledShutterIndices.map(i => shutterSpeeds[i]!.label))
      .toEqual(['1/8000 s', '1/1000 s', '1/125 s', '1/15 s', '0.5 s', '4.0 s', '30.0 s'])
  })

  it('is a subset of the whole-stop marks', () => {
    for (const index of labelledShutterIndices) {
      expect(wholeStopShutterIndices).toContain(index)
    }
  })

  it('spaces them three stops apart, so the log scale draws them evenly', () => {
    for (let i = 1; i < labelledShutterIndices.length; i++) {
      const a = shutterSpeeds[labelledShutterIndices[i - 1]!]!.value
      const b = shutterSpeeds[labelledShutterIndices[i]!]!.value
      expect(Math.abs(Math.log2(b / a) - 3)).toBeLessThan(0.3)
    }
  })
})
