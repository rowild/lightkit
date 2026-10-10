import { describe, it, expect } from 'vitest'
import { useSun } from '~/composables/useSun'
import type { Vec3 } from '~/utils/globeMath'
import {
  BOW_RADIUS,
  OBSERVER,
  PATH_SAMPLES,
  WINDOW_NAMES,
  WINDOW_SAMPLES,
  buildSkyModel,
  clockPoint,
  layoutPoint,
  skyPoint,
  sunSample,
  sunTimeFor,
  viewerRight,
  visibilityOnBow,
  type SkyModel
} from '~/utils/skyGeometry'

const PLACES: Record<string, [number, number]> = {
  reykjavik: [64.1466, -21.9426],
  quito: [-0.18, -78.47],
  tromso: [69.6496, 18.956],
  sydney: [-33.87, 151.21],
  svalbard: [78.2232, 15.6267]
}
const DATES = ['2026-06-21', '2026-10-10', '2026-12-21']
const noonOf = (iso: string) => new Date(`${iso}T12:00:00`)
const sun = useSun()

const eachModel = (check: (model: SkyModel, date: Date, lat: number, lng: number) => void) => {
  for (const [lat, lng] of Object.values(PLACES)) {
    for (const iso of DATES) {
      const date = noonOf(iso)
      check(buildSkyModel(date, lat, lng), date, lat, lng)
    }
  }
}
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const expectVec = (actual: Vec3, expected: Vec3) => {
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, 9))
}

describe('buildSkyModel', () => {
  it('takes every window from getSolarSegments, to the millisecond', () => {
    eachModel((model, date, lat, lng) => {
      const expected = sun
        .getSolarSegments(date, lat, lng)
        .filter(s => (WINDOW_NAMES as readonly string[]).includes(s.name))
        .map(s => [s.name, s.start.getTime(), s.end.getTime()])
      expect(model.windows.map(w => [w.name, w.start.getTime(), w.end.getTime()])).toEqual(expected)
    })
  })

  it('has no golden or blue window on a polar day or a polar night', () => {
    expect(buildSkyModel(noonOf('2026-06-21'), 78.2232, 15.6267).windows.map(w => w.name)).toEqual(['Daylight'])
    expect(buildSkyModel(noonOf('2026-12-21'), 78.2232, 15.6267).windows).toEqual([])
  })

  it('always samples the path PATH_SAMPLES times, from one nadir to the next', () => {
    eachModel((model) => {
      expect(model.path).toHaveLength(PATH_SAMPLES)
      expect(model.path[0]!.t).toBe(model.spanStart)
      expect(model.path.at(-1)!.t).toBe(model.spanEnd)
      expect(model.path[0]!.f).toBe(0)
      expect(model.path.at(-1)!.f).toBe(1)
      for (let i = 1; i < model.path.length; i++) {
        expect(model.path[i]!.t).toBeGreaterThan(model.path[i - 1]!.t)
      }
    })
  })

  it('starts and ends every window exactly on its boundaries, in its own kind', () => {
    eachModel((model) => {
      for (const w of model.windows) {
        expect(w.samples).toHaveLength(WINDOW_SAMPLES)
        expect(w.samples[0]!.t).toBe(w.start.getTime())
        expect(w.samples.at(-1)!.t).toBe(w.end.getTime())
        expect(new Set(w.samples.map(s => s.kind))).toEqual(new Set([w.kind]))
      }
    })
  })

  it('gives each path sample the kind of the segment it falls in', () => {
    const date = noonOf('2026-10-10')
    const [lat, lng] = PLACES.reykjavik!
    const model = buildSkyModel(date, lat, lng)
    const golden = sun.getSolarSegments(date, lat, lng).find(s => s.name === 'Morning Golden Hour')!
    const inside = model.path.filter(s => s.t >= golden.start.getTime() && s.t < golden.end.getTime())
    expect(inside.length).toBeGreaterThan(0)
    expect(new Set(inside.map(s => s.kind))).toEqual(new Set(['golden']))
  })

  it('puts a bead on every full hour of the device clock, with strength from the altitude', () => {
    eachModel((model) => {
      expect(model.beads.length).toBeGreaterThanOrEqual(23)
      expect(model.beads.length).toBeLessThanOrEqual(26)
      for (const bead of model.beads) {
        const d = new Date(bead.t)
        expect([d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0])
        expect(bead.t).toBeGreaterThanOrEqual(model.spanStart)
        expect(bead.t).toBeLessThanOrEqual(model.spanEnd)
        expect(bead.strength).toBeGreaterThanOrEqual(0)
        expect(bead.strength).toBeLessThanOrEqual(1)
        if (bead.alt <= 0) expect(bead.strength).toBe(0)
      }
    })
  })

  it('keeps one bead per real hour across a daylight-saving change', () => {
    const previous = process.env.TZ
    process.env.TZ = 'Europe/Vienna'
    try {
      // 25 October 2026: Vienna's clocks go back from 03:00 to 02:00.
      const model = buildSkyModel(new Date('2026-10-25T12:00:00'), 48.2082, 16.3738)
      const times = model.beads.map(b => b.t)
      expect(new Set(times).size).toBe(times.length)
      for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBe(3_600_000)
      for (const t of times) expect(new Date(t).getMinutes()).toBe(0)
    } finally {
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  })

  it('marks the southern hemisphere', () => {
    expect(buildSkyModel(noonOf('2026-10-10'), -33.87, 151.21).southern).toBe(true)
    expect(buildSkyModel(noonOf('2026-10-10'), 0, 0).southern).toBe(false)
  })
})

describe('sunTimeFor', () => {
  it('is now on today’s date', () => {
    const now = new Date('2026-10-10T15:20:00')
    expect(sunTimeFor(noonOf('2026-10-10'), 64.1466, -21.9426, now)).toBe(now)
  })

  it('is solar noon on any other date', () => {
    const date = noonOf('2026-12-21')
    expect(sunTimeFor(date, 64.1466, -21.9426, new Date('2026-10-10T15:20:00')).getTime())
      .toBe(sun.getSolarTimes(date, 64.1466, -21.9426).solarNoon.getTime())
  })
})

describe('sunSample', () => {
  const model = buildSkyModel(noonOf('2026-10-10'), 64.1466, -21.9426)

  it('reads the sun where SunCalc puts it', () => {
    const time = new Date('2026-10-10T14:00:00')
    const expected = sun.getSunPosition(time, 64.1466, -21.9426)
    const s = sunSample(model, time)
    expect(s.alt).toBeCloseTo(expected.altitude, 9)
    expect(s.az).toBeCloseTo(expected.azimuth, 9)
  })

  it('wraps f round the span, because the day repeats', () => {
    const hour = 3_600_000
    const T = model.spanEnd - model.spanStart
    expect(sunSample(model, new Date(model.spanStart - hour)).f).toBeCloseTo(1 - hour / T, 9)
    expect(sunSample(model, new Date(model.spanEnd + hour)).f).toBeCloseTo(hour / T, 9)
  })

  it('does not pin the sun at the end of the span for a distant place', () => {
    const sydney = buildSkyModel(noonOf('2026-10-10'), -33.87, 151.21)
    const T = sydney.spanEnd - sydney.spanStart
    const s = sunSample(sydney, new Date(sydney.spanEnd + 6 * 3_600_000))
    expect(s.f).toBeCloseTo((6 * 3_600_000) / T, 9)
    expect(s.f).toBeGreaterThan(0.2)
    expect(s.f).toBeLessThan(0.3)
  })

  it('maps real SunCalc azimuths to the compass side: morning east (+X), afternoon west (-X)', () => {
    const noon = sun.getSolarTimes(noonOf('2026-10-10'), 64.1466, -21.9426).solarNoon.getTime()
    const up = model.path.filter((p) => p.alt > 0)
    const morning = up.find((p) => p.t < noon)!
    const afternoon = [...up].reverse().find((p) => p.t > noon)!
    expect(skyPoint(morning)[0]).toBeGreaterThan(0)
    expect(skyPoint(afternoon)[0]).toBeLessThan(0)
  })
})

describe('skyPoint', () => {
  const fromObserver = (p: Vec3) => Math.hypot(...sub(p, OBSERVER))

  it('lays the horizon in the plane through the place, at the bow radius', () => {
    for (const az of [0, 37, 90, 180, 271]) {
      const p = skyPoint({ alt: 0, az })
      expect(p[1]).toBeCloseTo(OBSERVER[1], 12)
      expect(fromObserver(p)).toBeCloseTo(BOW_RADIUS, 12)
    }
  })

  it('puts the zenith straight above the place', () => {
    expectVec(skyPoint({ alt: 90, az: 123 }), [0, OBSERVER[1] + BOW_RADIUS, 0])
  })

  it('puts east on +X, south on +Z and north on −Z', () => {
    expectVec(skyPoint({ alt: 0, az: 90 }), [BOW_RADIUS, OBSERVER[1], 0])
    expectVec(skyPoint({ alt: 0, az: 180 }), [0, OBSERVER[1], BOW_RADIUS])
    expectVec(skyPoint({ alt: 0, az: 0 }), [0, OBSERVER[1], -BOW_RADIUS])
  })

  it('puts a blue-hour sun below the horizon', () => {
    expect(skyPoint({ alt: -6, az: 250 })[1]).toBeLessThan(OBSERVER[1])
  })
})

describe('clockPoint', () => {
  // "Left" is measured against the camera's right-hand direction, which faces
  // the other way south of the equator.
  for (const southern of [false, true]) {
    const where = southern ? 'south' : 'north'
    const side = (p: Vec3) => dot(sub(p, OBSERVER), viewerRight(southern))

    it(`reads morning on the left ${where} of the equator`, () => {
      expect(side(clockPoint(0, southern))).toBeCloseTo(-BOW_RADIUS, 12)
      expect(side(clockPoint(1, southern))).toBeCloseTo(BOW_RADIUS, 12)
      expectVec(clockPoint(0.5, southern), [0, OBSERVER[1] + BOW_RADIUS, 0])
    })

    it(`stays on or above the horizon ${where} of the equator`, () => {
      for (let f = 0; f <= 1; f += 0.05) {
        expect(clockPoint(f, southern)[1]).toBeGreaterThanOrEqual(OBSERVER[1] - 1e-12)
      }
    })
  }
})

describe('layoutPoint', () => {
  it('uses the sky layout for "sky" and the clock layout for "clock"', () => {
    const s = { t: 0, alt: 12, az: 140, f: 0.3, kind: 'day' as const }
    expectVec(layoutPoint(s, 'sky', false), skyPoint(s))
    expectVec(layoutPoint(s, 'clock', true), clockPoint(0.3, true))
  })
})

describe('visibilityOnBow', () => {
  it('shows everything on the clock', () => {
    expect(visibilityOnBow(-40, 'clock')).toBe(1)
  })

  it('fades the sky path from the horizon to nothing at −18°', () => {
    expect(visibilityOnBow(10, 'sky')).toBe(1)
    expect(visibilityOnBow(0, 'sky')).toBe(1)
    expect(visibilityOnBow(-9, 'sky')).toBeCloseTo(0.5, 12)
    expect(visibilityOnBow(-18, 'sky')).toBe(0)
    expect(visibilityOnBow(-40, 'sky')).toBe(0)
  })
})
