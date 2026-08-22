/** Result of evaluating whether the reported weather is suitable for flight. */
export type Flyability = {
  readonly status: 'safe' | 'caution' | 'unsafe'
  readonly reason: string
}

/** Weather inputs that affect the drone-safety verdict. */
export type FlyabilityInput = {
  readonly windSpeedKmH: number
  readonly windGustKmH: number
  readonly conditionCode: number
  readonly cloudsPercent: number
}

/** Evaluate drone safety from weather condition codes and wind measurements. */
export const evaluateFlyability = (input: FlyabilityInput): Flyability => {
  const { windSpeedKmH, windGustKmH, conditionCode, cloudsPercent } = input
  const isThunderstorm = conditionCode >= 200 && conditionCode < 300
  const isPrecipitation = (conditionCode >= 300 && conditionCode < 400)
    || (conditionCode >= 500 && conditionCode < 700)
  const isSevereAtmosphere = conditionCode === 771 || conditionCode === 781

  if (isThunderstorm || isSevereAtmosphere) {
    return { status: 'unsafe', reason: 'Severe weather detected. Ground your drone.' }
  }
  if (isPrecipitation) {
    return { status: 'unsafe', reason: 'Precipitation detected. Ground your drone.' }
  }
  if (windGustKmH >= 30) {
    return {
      status: 'unsafe',
      reason: `Extreme wind gusts (${windGustKmH.toFixed(0)} km/h) exceed safety limits.`
    }
  }
  if (windSpeedKmH >= 25) {
    return {
      status: 'unsafe',
      reason: `High wind speed (${windSpeedKmH.toFixed(0)} km/h) is dangerous for small drones.`
    }
  }
  if (windGustKmH >= 20 || windSpeedKmH >= 15) {
    return {
      status: 'caution',
      reason: `Moderate winds (${windSpeedKmH.toFixed(0)} km/h, gusting to ${windGustKmH.toFixed(0)} km/h). Expect battery drain and drift.`
    }
  }

  const sky = cloudsPercent > 80
    ? ' Overcast sky: poor golden hour colors, but safe to fly.'
    : cloudsPercent < 20
      ? ' Clear skies: perfect lighting.'
      : ' Scattered clouds: beautiful dynamic shadows.'
  return { status: 'safe', reason: `Excellent flying conditions.${sky}` }
}
