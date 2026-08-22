/**
 * The OpenWeatherMap key, shared between the settings drawer and the weather
 * fetcher.
 *
 * These sit in different parts of the tree now that the tools are routes: the
 * drawer lives in the layout, the fetching lives in the solar page. `useState`
 * keeps one value across both. It used to be a plain ref inside `useWeather`,
 * which worked only while a single component owned everything.
 *
 * The key is the user's own credential and never leaves the browser except in
 * the request to OpenWeatherMap.
 */
const STORAGE_KEY = 'OWM_API_KEY'

export const useApiKey = () => {
  const apiKey = useState<string>('owm-api-key', () => '')

  /** Read once on the client. Safe to call from several components. */
  const restore = () => {
    if (!import.meta.client) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) apiKey.value = saved
  }

  const setApiKey = (key: string) => {
    const trimmed = key.trim()
    apiKey.value = trimmed
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, trimmed)
  }

  const clearApiKey = () => {
    apiKey.value = ''
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  return { apiKey, restore, setApiKey, clearApiKey }
}
