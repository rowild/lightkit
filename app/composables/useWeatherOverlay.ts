/**
 * How strongly each weather layer is painted over the map.
 *
 * Shared state, like `useApiKey`, because the two ends of it sit in different
 * parts of the tree: the sliders live in the settings drawer in the layout, the
 * layer being painted lives in the map on the solar page. A `usePersistedRef`
 * would give each of them its OWN ref - that helper deliberately does not share
 * - and the slider would move nothing.
 *
 * One stored object rather than one key per layer: they are read and written
 * together, and a half-written set is a state nobody wants to reason about.
 */
export const WEATHER_LAYERS = [
  { id: 'clouds_new', label: 'Clouds' },
  { id: 'precipitation_new', label: 'Rain' },
  { id: 'wind', label: 'Wind' },
  { id: 'pressure_new', label: 'Pressure' },
  { id: 'temp_new', label: 'Temperature' }
] as const

export type WeatherLayerId = (typeof WEATHER_LAYERS)[number]['id']

export type WeatherOpacity = Record<WeatherLayerId, number>

const STORAGE_KEY = 'dpt:weather-opacity'

/** Enough to read the pattern, not enough to hide the ground you launch from. */
const DEFAULTS: WeatherOpacity = {
  clouds_new: 65,
  precipitation_new: 65,
  wind: 65,
  // Both of these paint the whole tile edge to edge rather than only where
  // there is weather, so at 65% they bury the ground entirely.
  pressure_new: 45,
  temp_new: 45
}

const clamp = (value: unknown, fallback: number) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(100, Math.max(0, Math.round(n)))
}

export const useWeatherOverlay = () => {
  const opacity = useState<WeatherOpacity>('weather-opacity', () => ({ ...DEFAULTS }))

  /**
   * Read once on the client. Safe to call from several components, and every
   * value is clamped on the way in - localStorage is user-writable, and a
   * layer opacity of 4000 or "banana" must not reach OpenLayers.
   */
  const restore = () => {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<WeatherOpacity>
      opacity.value = Object.fromEntries(
        WEATHER_LAYERS.map(l => [l.id, clamp(saved?.[l.id], DEFAULTS[l.id])])
      ) as WeatherOpacity
    } catch {
      // Unparseable or blocked. The defaults above are already in place.
    }

  }

  const setOpacity = (layer: WeatherLayerId, percent: number) => {
    opacity.value = { ...opacity.value, [layer]: clamp(percent, DEFAULTS[layer]) }
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opacity.value))
    } catch {
      // Storage full or blocked. The setting still applies for this session.
    }
  }

  return { opacity, restore, setOpacity }
}
