import { describe, expect, it } from 'vitest'
import {
  describePrecipitation,
  precipitationFromCurrent,
  precipitationFromForecast
} from '~/utils/weatherPrecipitation'

describe('precipitationFromCurrent', () => {
  it('reads the current rain rate in millimetres per hour', () => {
    expect(precipitationFromCurrent({ rain: { '1h': 0.7 } })).toEqual({
      rainMmPerHour: 0.7,
      snowMmPerHour: 0,
      probabilityPercent: null
    })
  })

  it('reads the current snow rate independently from rain', () => {
    expect(precipitationFromCurrent({ snow: { '1h': 1.2 } })).toEqual({
      rainMmPerHour: 0,
      snowMmPerHour: 1.2,
      probabilityPercent: null
    })
  })
})

describe('precipitationFromForecast', () => {
  it('normalizes three-hour rain and snow totals to hourly rates', () => {
    expect(precipitationFromForecast({
      rain: { '3h': 3 },
      snow: { '3h': 1.5 }
    })).toEqual({
      rainMmPerHour: 1,
      snowMmPerHour: 0.5,
      probabilityPercent: null
    })
  })

  it('converts forecast probability to a percentage', () => {
    expect(precipitationFromForecast({ pop: 0.6 }).probabilityPercent).toBe(60)
  })
})

describe('describePrecipitation', () => {
  it('explicitly reports when there is no precipitation', () => {
    expect(describePrecipitation({
      rainMmPerHour: 0,
      snowMmPerHour: 0,
      probabilityPercent: null
    })).toEqual({
      kind: 'none',
      label: 'None',
      detail: ''
    })
  })

  it('describes rain with its hourly rate', () => {
    expect(describePrecipitation({
      rainMmPerHour: 0.7,
      snowMmPerHour: 0,
      probabilityPercent: null
    })).toEqual({
      kind: 'rain',
      label: 'Rain',
      detail: '0.7 mm/h'
    })
  })

  it('describes snow with its hourly rate', () => {
    expect(describePrecipitation({
      rainMmPerHour: 0,
      snowMmPerHour: 1.2,
      probabilityPercent: null
    })).toEqual({
      kind: 'snow',
      label: 'Snow',
      detail: '1.2 mm/h'
    })
  })

  it('keeps both rates when rain and snow are mixed', () => {
    expect(describePrecipitation({
      rainMmPerHour: 0.7,
      snowMmPerHour: 0.3,
      probabilityPercent: null
    })).toEqual({
      kind: 'mixed',
      label: 'Rain + snow',
      detail: 'rain 0.7 · snow 0.3 mm/h'
    })
  })

  it('includes forecast probability before the expected rate', () => {
    expect(describePrecipitation({
      rainMmPerHour: 0.7,
      snowMmPerHour: 0,
      probabilityPercent: 60
    })).toEqual({
      kind: 'rain',
      label: 'Rain',
      detail: '60% · 0.7 mm/h'
    })
  })

  it('keeps forecast probability when no precipitation volume is expected', () => {
    expect(describePrecipitation({
      rainMmPerHour: 0,
      snowMmPerHour: 0,
      probabilityPercent: 20
    })).toEqual({
      kind: 'none',
      label: 'None',
      detail: '20% chance'
    })
  })
})
