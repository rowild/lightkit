/** Precipitation values normalized to an hourly rate for display. */
export type WeatherPrecipitation = {
  readonly rainMmPerHour: number
  readonly snowMmPerHour: number
  readonly probabilityPercent: number | null
}

/** Text projection used by both the detailed report and compact weather strip. */
export type PrecipitationDisplay = {
  readonly kind: 'none' | 'rain' | 'snow' | 'mixed'
  readonly label: string
  readonly detail: string
}

const readRecord = (input: unknown): Readonly<Record<string, unknown>> | null => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  // SAFETY: The runtime checks above establish a non-null, non-array object;
  // callers can only read unknown properties from this boundary projection.
  return input as Readonly<Record<string, unknown>>
}

const readNonNegativeNumber = (input: unknown): number => {
  return typeof input === 'number' && Number.isFinite(input) && input > 0 ? input : 0
}

const readHourlyVolume = (input: unknown): number => {
  const volume = readRecord(input)
  return readNonNegativeNumber(volume?.['1h'])
}

const readThreeHourVolumeAsRate = (input: unknown): number => {
  const volume = readRecord(input)
  return readNonNegativeNumber(volume?.['3h']) / 3
}

const readProbabilityPercent = (input: unknown): number | null => {
  if (typeof input !== 'number' || !Number.isFinite(input)) return null
  return Math.min(1, Math.max(0, input)) * 100
}

const withProbability = (probabilityPercent: number | null, detail: string): string => {
  return probabilityPercent === null
    ? detail
    : `${Math.round(probabilityPercent)}% · ${detail}`
}

/** Parse the optional rain and snow fields in an OpenWeather current response. */
export const precipitationFromCurrent = (input: unknown): WeatherPrecipitation => {
  const weather = readRecord(input)
  return {
    rainMmPerHour: readHourlyVolume(weather?.rain),
    snowMmPerHour: readHourlyVolume(weather?.snow),
    probabilityPercent: null
  }
}

/** Parse and normalize an OpenWeather three-hour forecast block. */
export const precipitationFromForecast = (input: unknown): WeatherPrecipitation => {
  const weather = readRecord(input)
  return {
    rainMmPerHour: readThreeHourVolumeAsRate(weather?.rain),
    snowMmPerHour: readThreeHourVolumeAsRate(weather?.snow),
    probabilityPercent: readProbabilityPercent(weather?.pop)
  }
}

/** Describe normalized precipitation in concise, user-facing terms. */
export const describePrecipitation = (precipitation: WeatherPrecipitation): PrecipitationDisplay => {
  if (precipitation.rainMmPerHour > 0 && precipitation.snowMmPerHour > 0) {
    return {
      kind: 'mixed',
      label: 'Rain + snow',
      detail: withProbability(
        precipitation.probabilityPercent,
        `rain ${precipitation.rainMmPerHour.toFixed(1)} · snow ${precipitation.snowMmPerHour.toFixed(1)} mm/h`
      )
    }
  }
  if (precipitation.rainMmPerHour > 0) {
    return {
      kind: 'rain',
      label: 'Rain',
      detail: withProbability(
        precipitation.probabilityPercent,
        `${precipitation.rainMmPerHour.toFixed(1)} mm/h`
      )
    }
  }
  if (precipitation.snowMmPerHour > 0) {
    return {
      kind: 'snow',
      label: 'Snow',
      detail: withProbability(
        precipitation.probabilityPercent,
        `${precipitation.snowMmPerHour.toFixed(1)} mm/h`
      )
    }
  }
  return {
    kind: 'none',
    label: 'None',
    detail: precipitation.probabilityPercent === null
      ? ''
      : `${Math.round(precipitation.probabilityPercent)}% chance`
  }
}
