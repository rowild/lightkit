import { ref, getCurrentInstance, onUnmounted } from 'vue'

/**
 * Place search and place names from OpenStreetMap's Nominatim.
 *
 * Moved out of `LocationPicker.vue` on 2026-10-10 so the sky view could search
 * the same way. Same URLs, same 400ms debounce, same names as before.
 */

/** One Nominatim search hit, as the API returns it. */
export interface PlaceResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

type Fetcher = typeof fetch

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const HEADERS = { 'Accept-Language': 'en' }
const DEBOUNCE_MS = 400

export const formatCoordinates = (lat: number, lng: number) =>
  `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`

/**
 * Up to five places matching `query`. `null` when the request fails or is
 * refused, so a caller can keep what it was already showing.
 */
export const searchPlaces = async (query: string, fetcher: Fetcher = fetch): Promise<PlaceResult[] | null> => {
  try {
    const response = await fetcher(
      `${NOMINATIM}/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
      { headers: HEADERS }
    )
    if (!response.ok) return null
    return (await response.json()) as PlaceResult[]
  } catch (err) {
    console.error('Error fetching geocoding results', err)
    return null
  }
}

/**
 * A short name for a coordinate: "City, Country" when the address has both,
 * else Nominatim's full display name, else the coordinates themselves. `null`
 * when the request fails or is refused.
 */
export const reverseGeocodeName = async (lat: number, lng: number, fetcher: Fetcher = fetch): Promise<string | null> => {
  try {
    const response = await fetcher(
      `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,
      { headers: HEADERS }
    )
    if (!response.ok) return null
    const data = await response.json()
    const address = data?.address
    if (address) {
      const city = address.city || address.town || address.village || address.municipality || address.suburb
      if (city && address.country) return `${city}, ${address.country}`
    }
    if (data?.display_name) return data.display_name
    return formatCoordinates(lat, lng)
  } catch (err) {
    console.error('[usePlaceSearch] Reverse geocoding failed', err)
    return null
  }
}

/**
 * Wraps an async function so only the latest call's answer is delivered. An
 * answer that arrives after a newer call was made resolves to `undefined`: a
 * slow reply for the place tapped first must not overwrite the name of the
 * place tapped second.
 */
export const latestOnly = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => {
  let latest = 0
  return async (...args: A): Promise<R | undefined> => {
    const id = ++latest
    const result = await fn(...args)
    return id === latest ? result : undefined
  }
}

/**
 * A search field's state and its debounced lookup, shared by the map and the
 * sky view so the two behave the same way.
 */
export const usePlaceSearch = (fetcher: Fetcher = fetch) => {
  const query = ref('')
  const results = ref<PlaceResult[]>([])
  const showResults = ref(false)
  const search = latestOnly((q: string) => searchPlaces(q, fetcher))
  let timer: ReturnType<typeof setTimeout> | null = null

  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const onInput = () => {
    cancel()
    if (!query.value.trim()) {
      results.value = []
      showResults.value = false
      return
    }
    // Debounced to be polite to Nominatim, whose usage policy asks for it.
    timer = setTimeout(async () => {
      const found = await search(query.value)
      if (!found) return
      results.value = found
      showResults.value = found.length > 0
    }, DEBOUNCE_MS)
  }

  const clear = () => {
    cancel()
    query.value = ''
    results.value = []
    showResults.value = false
  }

  if (getCurrentInstance()) onUnmounted(cancel)

  return { query, results, showResults, onInput, clear }
}
