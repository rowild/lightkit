/** One pressure value at a known instant. */
export type PressureSample = {
  readonly atUnixSeconds: number
  readonly pressureHpa: number
}

/** Direction and magnitude of a pressure change. */
export type PressureTrend = {
  readonly direction: 'rising' | 'steady' | 'falling'
  readonly changeHpa: number
  readonly intervalHours: number
}

/** The time represented by a weather report. */
export type WeatherReportTime = {
  readonly kind: 'current' | 'forecast'
  readonly atUnixSeconds: number
  readonly timezoneOffsetSeconds: number
}

/** Labels used to render the time represented by a weather report. */
export type WeatherReportTimeDisplay = {
  readonly label: 'Updated' | 'Forecast'
  readonly value: string
  readonly detail: string
}

const readRecord = (input: unknown): Readonly<Record<string, unknown>> | null => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  // SAFETY: The runtime checks establish a non-null, non-array object. This
  // projection only permits property reads whose values remain unknown.
  return input as Readonly<Record<string, unknown>>
}

/** Parse pressure samples from an untrusted OpenWeather forecast list. */
export const pressureSamplesFromForecast = (input: unknown): ReadonlyArray<PressureSample> => {
  if (!Array.isArray(input)) return []
  const samples: PressureSample[] = []
  for (const entry of input) {
    const record = readRecord(entry)
    const main = readRecord(record?.main)
    const atUnixSeconds = record?.dt
    const pressureHpa = main?.pressure
    if (
      typeof atUnixSeconds === 'number'
      && Number.isFinite(atUnixSeconds)
      && typeof pressureHpa === 'number'
      && Number.isFinite(pressureHpa)
      && pressureHpa > 0
    ) {
      samples.push({ atUnixSeconds, pressureHpa })
    }
  }
  return samples
}

/** Calculate the pressure movement around a weather reading. */
export const pressureTrendAt = (
  target: PressureSample,
  samples: ReadonlyArray<PressureSample>
): PressureTrend | null => {
  const sixHoursLater = target.atUnixSeconds + 6 * 60 * 60
  const sixHoursEarlier = target.atUnixSeconds - 6 * 60 * 60

  const future = samples
    .filter(sample => sample.atUnixSeconds > target.atUnixSeconds)
    .reduce<PressureSample | null>((nearest, sample) => {
      if (!nearest) return sample
      return Math.abs(sample.atUnixSeconds - sixHoursLater)
        < Math.abs(nearest.atUnixSeconds - sixHoursLater)
        ? sample
        : nearest
    }, null)

  const past = samples
    .filter(sample => sample.atUnixSeconds < target.atUnixSeconds)
    .reduce<PressureSample | null>((nearest, sample) => {
      if (!nearest) return sample
      return Math.abs(sample.atUnixSeconds - sixHoursEarlier)
        < Math.abs(nearest.atUnixSeconds - sixHoursEarlier)
        ? sample
        : nearest
    }, null)

  const comparison = future ?? past
  if (!comparison) return null

  const from = future ? target : comparison
  const to = future ?? target
  const changeHpa = Math.round((to.pressureHpa - from.pressureHpa) * 10) / 10
  const intervalHours = Math.round(
    Math.abs(to.atUnixSeconds - from.atUnixSeconds) / 360
  ) / 10

  return {
    direction: changeHpa >= 1
      ? 'rising'
      : changeHpa <= -1
        ? 'falling'
        : 'steady',
    changeHpa,
    intervalHours
  }
}

/** Render a pressure movement beside its hPa reading. */
export const describePressureTrend = (trend: PressureTrend): string => {
  if (trend.direction === 'steady') return 'steady'
  const magnitude = Math.abs(trend.changeHpa)
  const change = Number.isInteger(magnitude) ? magnitude.toFixed(0) : magnitude.toFixed(1)
  const hours = Number.isInteger(trend.intervalHours)
    ? trend.intervalHours.toFixed(0)
    : trend.intervalHours.toFixed(1)
  return `${trend.direction} ${change}/${hours}h`
}

/** Render current-observation age or forecast-block time. */
export const describeWeatherReportTime = (
  report: WeatherReportTime,
  nowUnixSeconds: number
): WeatherReportTimeDisplay => {
  const localSeconds = report.atUnixSeconds + report.timezoneOffsetSeconds
  const secondsWithinDay = ((localSeconds % 86_400) + 86_400) % 86_400
  const hours = Math.floor(secondsWithinDay / 3_600).toString().padStart(2, '0')
  const minutes = Math.floor((secondsWithinDay % 3_600) / 60).toString().padStart(2, '0')

  if (report.kind === 'forecast') {
    return {
      label: 'Forecast',
      value: `${hours}:${minutes}`,
      detail: '3-hour block'
    }
  }

  const ageSeconds = Math.max(0, nowUnixSeconds - report.atUnixSeconds)
  const detail = ageSeconds < 60
    ? 'just now'
    : ageSeconds < 3_600
      ? `${Math.floor(ageSeconds / 60)} min ago`
      : ageSeconds < 86_400
        ? `${Math.floor(ageSeconds / 3_600)} h ago`
        : `${Math.floor(ageSeconds / 86_400)} d ago`

  return {
    label: 'Updated',
    value: `${hours}:${minutes}`,
    detail
  }
}
