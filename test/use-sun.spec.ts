import { describe, it, expect } from 'vitest'
import { useSun, SOLAR_ALTITUDES } from '~/composables/useSun'

const noonOf = (iso: string) => new Date(`${iso}T12:00:00`)
const sun = useSun()
const names = (iso: string, lat: number, lng: number) =>
  sun.getSolarSegments(noonOf(iso), lat, lng).map(s => s.name)

describe('SOLAR_ALTITUDES', () => {
  it('names the four phase boundaries, in degrees', () => {
    expect(SOLAR_ALTITUDES).toEqual({ goldenTop: 6, horizon: 0, blueTop: -4, blueBottom: -8 })
  })
})

// Characterisation: these pin today's segment model, so moving its thresholds
// into SOLAR_ALTITUDES cannot change a single phase.
describe('getSolarSegments', () => {
  it('splits an October day in Reykjavik into nine phases', () => {
    expect(names('2026-10-10', 64.1466, -21.9426)).toEqual([
      'Night',
      'Morning Blue Hour',
      'Civil Twilight Transition',
      'Morning Golden Hour',
      'Daylight',
      'Evening Golden Hour',
      'Civil Twilight Transition',
      'Evening Blue Hour',
      'Night'
    ])
  })

  it('gives Tromsø golden hour but no blue hour at midsummer', () => {
    expect(names('2026-06-21', 69.6496, 18.956)).toEqual([
      'Morning Golden Hour',
      'Daylight',
      'Evening Golden Hour'
    ])
  })

  it('gives Tromsø blue hour but no golden hour at midwinter', () => {
    expect(names('2026-12-21', 69.6496, 18.956)).toEqual([
      'Night',
      'Morning Blue Hour',
      'Civil Twilight Transition',
      'Evening Blue Hour',
      'Night'
    ])
  })
})

describe('getPolarExplanation', () => {
  it('is empty on a day with golden or blue hour', () => {
    expect(sun.getPolarExplanation(noonOf('2026-10-10'), 64.1466, -21.9426)).toBe('')
  })

  it('explains polar day', () => {
    expect(sun.getPolarExplanation(noonOf('2026-06-21'), 78.2232, 15.6267)).toMatch(/^POLAR DAY/)
  })

  it('explains polar night', () => {
    expect(sun.getPolarExplanation(noonOf('2026-12-21'), 78.2232, 15.6267)).toMatch(/^POLAR NIGHT/)
  })
})
