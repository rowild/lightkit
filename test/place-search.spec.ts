import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatCoordinates,
  latestOnly,
  reverseGeocodeName,
  searchPlaces,
  usePlaceSearch
} from '~/composables/usePlaceSearch'

const reply = (body: unknown, ok = true) =>
  vi.fn(async (_url: string, _init?: RequestInit) => ({ ok, json: async () => body }) as unknown as Response)
const offline = () =>
  vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
    throw new TypeError('Failed to fetch')
  })
/** Let a chain of awaited promises finish. */
const settle = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('searchPlaces', () => {
  it('asks Nominatim for five English results', async () => {
    const hit = { place_id: 1, display_name: 'Tromsø, Norway', lat: '69.65', lon: '18.96' }
    const fetcher = reply([hit])
    expect(await searchPlaces('Tromsø', fetcher)).toEqual([hit])
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('https://nominatim.openstreetmap.org/search?format=json&limit=5&q=Troms%C3%B8')
    expect(init).toEqual({ headers: { 'Accept-Language': 'en' } })
  })

  it('returns null when Nominatim refuses', async () => {
    expect(await searchPlaces('x', reply([], false))).toBeNull()
  })

  it('returns null offline instead of throwing', async () => {
    expect(await searchPlaces('x', offline())).toBeNull()
  })
})

describe('reverseGeocodeName', () => {
  it('prefers "City, Country"', async () => {
    const fetcher = reply({ address: { city: 'Tromsø', country: 'Norway' }, display_name: 'long name' })
    expect(await reverseGeocodeName(69.65, 18.96, fetcher)).toBe('Tromsø, Norway')
  })

  it('falls back from city to town, village, municipality and suburb', async () => {
    const fetcher = reply({ address: { village: 'Hallstatt', country: 'Austria' } })
    expect(await reverseGeocodeName(47.56, 13.65, fetcher)).toBe('Hallstatt, Austria')
  })

  it('uses the display name when there is no city and country', async () => {
    const fetcher = reply({ address: { country: 'Antarctica' }, display_name: 'Ross Ice Shelf' })
    expect(await reverseGeocodeName(-81.5, -175, fetcher)).toBe('Ross Ice Shelf')
  })

  it('falls back to coordinates when Nominatim names nothing', async () => {
    expect(await reverseGeocodeName(64.14659, -21.94261, reply({}))).toBe('64.1466°, -21.9426°')
  })

  it('asks for zoom 12 in English', async () => {
    const fetcher = reply({})
    await reverseGeocodeName(64.1466, -21.9426, fetcher)
    expect(fetcher.mock.calls[0]![0]).toBe(
      'https://nominatim.openstreetmap.org/reverse?format=json&lat=64.1466&lon=-21.9426&zoom=12'
    )
  })

  it('returns null when refused or offline, so the caller keeps its name', async () => {
    expect(await reverseGeocodeName(1, 2, reply({}, false))).toBeNull()
    expect(await reverseGeocodeName(1, 2, offline())).toBeNull()
  })
})

describe('formatCoordinates', () => {
  it('prints four decimals and degree signs', () => {
    expect(formatCoordinates(64.14659, -21.94261)).toBe('64.1466°, -21.9426°')
  })
})

describe('latestOnly', () => {
  it('drops an answer that arrives after a newer call', async () => {
    const resolvers: Array<(value: string) => void> = []
    const slow = latestOnly((_: string) => new Promise<string>(resolve => resolvers.push(resolve)))
    const first = slow('first')
    const second = slow('second')
    resolvers[1]!('second answer')
    resolvers[0]!('first answer')
    expect(await second).toBe('second answer')
    expect(await first).toBeUndefined()
  })
})

describe('usePlaceSearch', () => {
  it('waits 400ms after the last keystroke before asking', async () => {
    vi.useFakeTimers()
    const fetcher = reply([{ place_id: 7, display_name: 'Quito, Ecuador', lat: '-0.18', lon: '-78.47' }])
    const search = usePlaceSearch(fetcher)
    search.query.value = 'Qu'
    search.onInput()
    await vi.advanceTimersByTimeAsync(200)
    search.query.value = 'Quito'
    search.onInput()
    await vi.advanceTimersByTimeAsync(399)
    expect(fetcher).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(search.results.value).toHaveLength(1)
    expect(search.showResults.value).toBe(true)
  })

  it('clears the list when the field is emptied', () => {
    const search = usePlaceSearch(reply([]))
    search.results.value = [{ place_id: 1, display_name: 'x', lat: '0', lon: '0' }]
    search.showResults.value = true
    search.query.value = '  '
    search.onInput()
    expect(search.results.value).toEqual([])
    expect(search.showResults.value).toBe(false)
  })

  it('cancels a pending search when cleared', async () => {
    vi.useFakeTimers()
    const fetcher = reply([])
    const search = usePlaceSearch(fetcher)
    search.query.value = 'Vienna'
    search.onInput()
    search.clear()
    await vi.advanceTimersByTimeAsync(500)
    expect(fetcher).not.toHaveBeenCalled()
    expect(search.query.value).toBe('')
  })
})
