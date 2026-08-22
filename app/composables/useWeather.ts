import { ref, watch, onMounted } from 'vue'
import {
  precipitationFromCurrent,
  precipitationFromForecast
} from '../utils/weatherPrecipitation'
import type { WeatherPrecipitation } from '../utils/weatherPrecipitation'
import {
  pressureSamplesFromForecast,
  pressureTrendAt
} from '../utils/weatherReport'
import type { PressureTrend, WeatherReportTime } from '../utils/weatherReport'
import { evaluateFlyability } from '../utils/weatherSafety'

export interface WeatherData {
  temp: number
  description: string
  icon: string
  windSpeed: number // in km/h
  windGust: number // in km/h, fallback to windSpeed if not available
  windDeg: number
  clouds: number // cloud cover %
  humidity: number
  /** Atmospheric pressure at the location, absent only for malformed data. */
  pressureHpa: number | null
  /** Forecast movement around the report time, when comparison data exists. */
  pressureTrend: PressureTrend | null
  /** Whether this is an observation or forecast, and its location-local time. */
  reportTime: WeatherReportTime
  /** Rain and snow normalized to hourly rates, plus forecast probability. */
  precipitation: WeatherPrecipitation
  /** Metres, as reported. 10000 is the ceiling OpenWeatherMap reports. */
  visibility: number
  /** °C. Derived, not fetched - see dewPoint(). */
  dewPoint: number
  /** °C between air temperature and dew point. Small means mist. */
  dewSpread: number
  flyability: 'safe' | 'caution' | 'unsafe'
  flyabilityReason: string
}

/** OpenWeatherMap's air quality index is 1-5, with these names. */
export interface AirQuality {
  aqi: number
  label: string
  pm25: number
}

const AQI_LABELS = ['Unknown', 'Good', 'Fair', 'Moderate', 'Poor', 'Very poor']

/**
 * Dew point from temperature and relative humidity, Magnus-Tetens.
 *
 * Worth deriving rather than fetching: both inputs are already in every
 * response, so this costs no request, and the number a photographer actually
 * wants is not the dew point itself but its DISTANCE from the air temperature.
 * When the two close to within a couple of degrees the air is at saturation and
 * you get mist at first light - which is either the shot or the reason there is
 * no shot.
 *
 * Constants are the standard ones for water above freezing; they drift over ice
 * but not by enough to move a fog verdict.
 */
const dewPoint = (tempC: number, humidity: number) => {
  const rh = Math.min(100, Math.max(1, humidity))
  const a = 17.27
  const b = 237.7
  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100)
  return (b * alpha) / (a - alpha)
}

export const useWeather = () => {
  // The key is shared state: the settings drawer in the layout writes it, this
  // fetcher in the solar page reads it. See useApiKey.
  const keyStore = useApiKey()
  const apiKey = keyStore.apiKey

  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Cached results to avoid over-fetching
  const currentWeather = ref<WeatherData | null>(null)
  const forecastList = ref<any[]>([])
  const forecastTimezoneOffsetSeconds = ref(0)
  const airQuality = ref<AirQuality | null>(null)

  onMounted(() => {
    keyStore.restore()
  })

  const dropCache = () => {
    currentWeather.value = null
    forecastList.value = []
    forecastTimezoneOffsetSeconds.value = 0
    airQuality.value = null
    error.value = null
  }

  const setApiKey = (key: string) => {
    keyStore.setApiKey(key)
    dropCache()
  }

  const clearApiKey = () => {
    keyStore.clearApiKey()
    dropCache()
  }

  /**
   * Fetch weather forecast & current data
   */
  const fetchWeather = async (lat: number, lon: number) => {
    if (!apiKey.value) {
      error.value = 'OpenWeatherMap API Key is missing. Configure it in settings.'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Fetch both current weather and 5-day forecast
      const [currRes, foreRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey.value}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey.value}&units=metric`)
      ])
      // Started, not awaited, and never thrown from. Air quality is one
      // endpoint further from what the user opened this tool for, so it must
      // not be able to hold up the wind reading or fail it.
      fetchAirQuality(lat, lon)

      if (!currRes.ok || !foreRes.ok) {
        throw new Error('Failed to fetch weather. Check if your API key is valid.')
      }

      const currData = await currRes.json()
      const foreData = await foreRes.json()
      forecastList.value = Array.isArray(foreData.list) ? foreData.list : []
      forecastTimezoneOffsetSeconds.value = typeof foreData.city?.timezone === 'number'
        ? foreData.city.timezone
        : 0
      const forecastPressureSamples = pressureSamplesFromForecast(forecastList.value)

      // Parse current weather
      const currentWindSpeed = (currData.wind?.speed || 0) * 3.6 // m/s to km/h
      const currentWindGust = (currData.wind?.gust || currData.wind?.speed || 0) * 3.6
      const currentClouds = currData.clouds?.all || 0
      const currentDesc = currData.weather?.[0]?.description || 'Clear'
      const currentConditionCode = typeof currData.weather?.[0]?.id === 'number'
        ? currData.weather[0].id
        : 800
      const currentPressure = typeof currData.main?.pressure === 'number'
        ? currData.main.pressure
        : null
      const currentAtUnixSeconds = typeof currData.dt === 'number'
        ? currData.dt
        : Math.floor(Date.now() / 1000)
      const currentTimezoneOffsetSeconds = typeof currData.timezone === 'number'
        ? currData.timezone
        : forecastTimezoneOffsetSeconds.value
      const flyInfo = evaluateFlyability({
        windSpeedKmH: currentWindSpeed,
        windGustKmH: currentWindGust,
        conditionCode: currentConditionCode,
        cloudsPercent: currentClouds
      })
      const currentTemp = currData.main?.temp || 0
      const currentHumidity = currData.main?.humidity || 0
      const currentDew = dewPoint(currentTemp, currentHumidity)

      currentWeather.value = {
        temp: currentTemp,
        description: currentDesc,
        icon: currData.weather?.[0]?.icon || '01d',
        windSpeed: currentWindSpeed,
        windGust: currentWindGust,
        windDeg: currData.wind?.deg || 0,
        clouds: currentClouds,
        humidity: currentHumidity,
        pressureHpa: currentPressure,
        pressureTrend: currentPressure === null
          ? null
          : pressureTrendAt(
              { atUnixSeconds: currentAtUnixSeconds, pressureHpa: currentPressure },
              forecastPressureSamples
            ),
        reportTime: {
          kind: 'current',
          atUnixSeconds: currentAtUnixSeconds,
          timezoneOffsetSeconds: currentTimezoneOffsetSeconds
        },
        precipitation: precipitationFromCurrent(currData),
        visibility: typeof currData.visibility === 'number' ? currData.visibility : 10000,
        dewPoint: currentDew,
        dewSpread: currentTemp - currentDew,
        flyability: flyInfo.status,
        flyabilityReason: flyInfo.reason
      }

    } catch (e: any) {
      error.value = e.message || 'An error occurred while fetching weather data.'
      currentWeather.value = null
      forecastList.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Get weather for a specific target date and time by finding the closest forecast block.
   */
  const getWeatherForDateTime = (targetDate: Date): WeatherData | null => {
    // If selected date is close to now, return current weather
    const now = new Date()
    const diffMs = Math.abs(targetDate.getTime() - now.getTime())
    
    // Under 1.5 hours difference -> return current weather if we have it
    if (diffMs < 1.5 * 60 * 60 * 1000 && currentWeather.value) {
      return currentWeather.value
    }

    if (forecastList.value.length === 0) {
      return currentWeather.value // Fallback to current weather if no forecast list
    }

    // Find the closest forecast block (forecasts are every 3 hours)
    const targetTime = targetDate.getTime()
    const firstItem = forecastList.value[0]
    if (!firstItem) return currentWeather.value

    let closestItem = firstItem
    let minDiff = Math.abs(closestItem.dt * 1000 - targetTime)

    for (const item of forecastList.value) {
      const diff = Math.abs(item.dt * 1000 - targetTime)
      if (diff < minDiff) {
        minDiff = diff
        closestItem = item
      }
    }

    // Parse the closest forecast
    const windSpeed = (closestItem.wind?.speed || 0) * 3.6
    const windGust = (closestItem.wind?.gust || closestItem.wind?.speed || 0) * 3.6
    const clouds = closestItem.clouds?.all || 0
    const description = closestItem.weather?.[0]?.description || 'Clear'
    const conditionCode = typeof closestItem.weather?.[0]?.id === 'number'
      ? closestItem.weather[0].id
      : 800
    const precipitation = precipitationFromForecast(closestItem)
    const temp = closestItem.main?.temp || 0
    const humidity = closestItem.main?.humidity || 0
    const pressureHpa = typeof closestItem.main?.pressure === 'number'
      ? closestItem.main.pressure
      : null
    const atUnixSeconds = typeof closestItem.dt === 'number'
      ? closestItem.dt
      : Math.floor(Date.now() / 1000)
    const dew = dewPoint(temp, humidity)

    const flyInfo = evaluateFlyability({
      windSpeedKmH: windSpeed,
      windGustKmH: windGust,
      conditionCode,
      cloudsPercent: clouds
    })

    return {
      temp,
      description,
      icon: closestItem.weather?.[0]?.icon || '01d',
      windSpeed,
      windGust,
      windDeg: closestItem.wind?.deg || 0,
      clouds,
      humidity,
      pressureHpa,
      pressureTrend: pressureHpa === null
        ? null
        : pressureTrendAt(
            { atUnixSeconds, pressureHpa },
            pressureSamplesFromForecast(forecastList.value)
          ),
      reportTime: {
        kind: 'forecast',
        atUnixSeconds,
        timezoneOffsetSeconds: forecastTimezoneOffsetSeconds.value
      },
      precipitation,
      visibility: typeof closestItem.visibility === 'number' ? closestItem.visibility : 10000,
      dewPoint: dew,
      dewSpread: temp - dew,
      flyability: flyInfo.status,
      flyabilityReason: flyInfo.reason
    }
  }

  /**
   * Air quality, for the haze it predicts rather than the health advice.
   * PM2.5 is the fraction that scatters light, so it says whether the mountains
   * on the horizon will be there at sunset or will be a grey wash.
   *
   * Deliberately silent on failure: it is one endpoint further from the thing
   * the user opened this tool for.
   */
  const fetchAirQuality = async (lat: number, lon: number) => {
    if (!apiKey.value) return
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey.value}`
      )
      if (!res.ok) return
      const data = await res.json()
      const entry = data?.list?.[0]
      if (!entry) return
      const aqi = Number(entry.main?.aqi)
      airQuality.value = {
        aqi,
        label: AQI_LABELS[aqi] ?? AQI_LABELS[0]!,
        pm25: Number(entry.components?.pm2_5 ?? 0)
      }
    } catch {
      airQuality.value = null
    }
  }

  return {
    apiKey,
    loading,
    error,
    currentWeather,
    airQuality,
    setApiKey,
    clearApiKey,
    fetchWeather,
    getWeatherForDateTime
  }
}
