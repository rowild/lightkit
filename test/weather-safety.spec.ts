import { describe, expect, it } from 'vitest'
import { evaluateFlyability } from '~/utils/weatherSafety'

describe('evaluateFlyability', () => {
  it('grounds the drone from a precipitation condition code regardless of description language', () => {
    expect(evaluateFlyability({
      windSpeedKmH: 4,
      windGustKmH: 6,
      conditionCode: 500,
      cloudsPercent: 70
    })).toEqual({
      status: 'unsafe',
      reason: 'Precipitation detected. Ground your drone.'
    })
  })

  it('distinguishes severe weather from ordinary precipitation', () => {
    expect(evaluateFlyability({
      windSpeedKmH: 4,
      windGustKmH: 6,
      conditionCode: 211,
      cloudsPercent: 70
    })).toEqual({
      status: 'unsafe',
      reason: 'Severe weather detected. Ground your drone.'
    })
  })

  it('preserves the wind caution threshold in clear weather', () => {
    expect(evaluateFlyability({
      windSpeedKmH: 16,
      windGustKmH: 21,
      conditionCode: 800,
      cloudsPercent: 0
    })).toEqual({
      status: 'caution',
      reason: 'Moderate winds (16 km/h, gusting to 21 km/h). Expect battery drain and drift.'
    })
  })
})
