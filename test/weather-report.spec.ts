import { describe, expect, it } from 'vitest'
import {
  describePressureTrend,
  describeWeatherReportTime,
  pressureSamplesFromForecast,
  pressureTrendAt
} from '~/utils/weatherReport'

describe('pressureSamplesFromForecast', () => {
  it('parses valid forecast pressure samples and rejects malformed entries', () => {
    expect(pressureSamplesFromForecast([
      { dt: 1_000, main: { pressure: 1012 } },
      { dt: 'later', main: { pressure: 1010 } },
      { dt: 11_800, main: {} }
    ])).toEqual([
      { atUnixSeconds: 1_000, pressureHpa: 1012 }
    ])
  })
})

describe('pressureTrendAt', () => {
  it('reports the forecast pressure change over the following six hours', () => {
    expect(pressureTrendAt(
      { atUnixSeconds: 1_000, pressureHpa: 1012 },
      [
        { atUnixSeconds: 11_800, pressureHpa: 1010 },
        { atUnixSeconds: 22_600, pressureHpa: 1008 }
      ]
    )).toEqual({
      direction: 'falling',
      changeHpa: -4,
      intervalHours: 6
    })
  })

  it('uses the preceding six hours at the end of the forecast', () => {
    expect(pressureTrendAt(
      { atUnixSeconds: 22_600, pressureHpa: 1014 },
      [
        { atUnixSeconds: 1_000, pressureHpa: 1010 },
        { atUnixSeconds: 11_800, pressureHpa: 1012 }
      ]
    )).toEqual({
      direction: 'rising',
      changeHpa: 4,
      intervalHours: 6
    })
  })

  it('treats a change under one hectopascal as steady', () => {
    expect(pressureTrendAt(
      { atUnixSeconds: 1_000, pressureHpa: 1012 },
      [{ atUnixSeconds: 22_600, pressureHpa: 1012.8 }]
    )).toEqual({
      direction: 'steady',
      changeHpa: 0.8,
      intervalHours: 6
    })
  })

  it('returns no trend when no comparison reading exists', () => {
    expect(pressureTrendAt(
      { atUnixSeconds: 1_000, pressureHpa: 1012 },
      []
    )).toBeNull()
  })
})

describe('describePressureTrend', () => {
  it('keeps a decimal when rounding would hide a meaningful change', () => {
    expect(describePressureTrend({
      direction: 'falling',
      changeHpa: -1.5,
      intervalHours: 6
    })).toBe('falling 1.5/6h')
  })

  it('does not print a meaningless change for steady pressure', () => {
    expect(describePressureTrend({
      direction: 'steady',
      changeHpa: 0.8,
      intervalHours: 6
    })).toBe('steady')
  })
})

describe('describeWeatherReportTime', () => {
  it('shows current data in the location time with its age', () => {
    expect(describeWeatherReportTime(
      {
        kind: 'current',
        atUnixSeconds: 57_600,
        timezoneOffsetSeconds: 3_600
      },
      58_080
    )).toEqual({
      label: 'Updated',
      value: '17:00',
      detail: '8 min ago'
    })
  })

  it('identifies the exact three-hour forecast block in location time', () => {
    expect(describeWeatherReportTime(
      {
        kind: 'forecast',
        atUnixSeconds: 61_200,
        timezoneOffsetSeconds: 3_600
      },
      58_080
    )).toEqual({
      label: 'Forecast',
      value: '18:00',
      detail: '3-hour block'
    })
  })
})
