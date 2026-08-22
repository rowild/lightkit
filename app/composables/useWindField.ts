import { ref, computed } from 'vue'
import { buildWindGrid, type WindGrid } from '../utils/windParticles'

/**
 * A grid of wind readings across the visible map, from Open-Meteo.
 *
 * **No API key.** Open-Meteo takes comma-separated coordinate lists and answers
 * for every one of them in a single request - measured on 2026-08-17 at 64
 * points in 397ms from the browser, and 400 points in 844ms. That is what makes
 * an arrow field affordable here; the alternatives do not:
 *
 *   - OpenWeatherMap's own wind layer is a colour wash of SPEED with no
 *     direction in it at all. Arrows live in their Maps 2.0 product, which
 *     answers 401 without a paid plan.
 *   - api.met.no is free and global but answers one point per request, and asks
 *     for an identifying User-Agent that a browser is not allowed to send.
 *   - api.weather.gov is free and needs no key, and returns 404 outside the
 *     United States.
 *
 * Free for non-commercial use, roughly 10,000 calls a day, CC-BY 4.0 - so the
 * credit belongs in the attribution dialog whenever this layer is drawn.
 */
export interface WindPoint {
  lat: number
  lon: number
  /** Degrees the wind blows FROM, as meteorology reports it. */
  direction: number
  /** km/h */
  speed: number
  /** km/h */
  gust: number
}

/**
 * 8x8 = 64 points.
 *
 * The binding constraint is NOT bandwidth, which is what an earlier version of
 * this comment assumed. **Open-Meteo charges per LOCATION, not per request**:
 * a 144-point grid is 144 calls against a 5,000-per-hour budget, so roughly 34
 * pans would lock a user out for the rest of the hour. Measured the hard way -
 * a 429 with "Hourly API request limit exceeded" during development.
 *
 * 64 points is ~78 pans an hour before the cap, and the cache and movement
 * threshold below are what turn that into a number no real session reaches.
 */
export const GRID = 8

/** Keep the outermost arrows off the map's edge, where they would be clipped. */
const INSET = 0.08

/** Wind does not change in ten minutes, and a refetch costs 64 calls. */
const CACHE_MS = 10 * 60 * 1000

/**
 * Refetch only once the view has really moved: the centre by more than a third
 * of the visible span, or the zoom by more than a factor of 1.4. Nudging the map
 * a few pixels used to cost a full grid.
 */
const MOVE_FRACTION = 0.34
const ZOOM_FACTOR = 1.4

/** After a 429, stop asking. The window is hourly, so a short retry is futile. */
const COOLDOWN_MS = 10 * 60 * 1000

export const useWindField = () => {
  const points = ref<WindPoint[]>([])
  const loading = ref(false)

  /**
   * The same readings as a lattice of vectors, for the particle layer.
   *
   * Built from the order the points came back in rather than from their
   * coordinates: Open-Meteo snaps each request to its own grid, so a row of
   * points asked for at one latitude can come back at several. The drift is
   * hundredths of a degree and invisible at any zoom this map reaches.
   */
  const grid = computed<WindGrid | null>(() => buildWindGrid(points.value, GRID, GRID))

  let inFlight: AbortController | null = null
  let fetchedExtent: [number, number, number, number] | null = null
  let fetchedAt = 0
  let blockedUntil = 0

  /** True when the cached field still describes what the map is showing. */
  const isCovered = (extent: [number, number, number, number]) => {
    if (!fetchedExtent) return false
    if (Date.now() - fetchedAt > CACHE_MS) return false

    const [west, south, east, north] = extent
    const [fw, fs, fe, fn] = fetchedExtent
    const span = east - west
    const fSpan = fe - fw
    if (fSpan <= 0 || span <= 0) return false

    const zoomRatio = span / fSpan
    if (zoomRatio > ZOOM_FACTOR || zoomRatio < 1 / ZOOM_FACTOR) return false

    const movedLon = Math.abs((east + west) / 2 - (fe + fw) / 2)
    const movedLat = Math.abs((north + south) / 2 - (fn + fs) / 2)
    return movedLon < span * MOVE_FRACTION && movedLat < (north - south) * MOVE_FRACTION
  }

  /**
   * @param extent [west, south, east, north] in degrees.
   */
  const fetchField = async (extent: [number, number, number, number]) => {
    const [west, south, east, north] = extent
    const spanLon = east - west
    const spanLat = north - south
    if (!Number.isFinite(spanLon) || !Number.isFinite(spanLat) || spanLon <= 0 || spanLat <= 0) return

    if (Date.now() < blockedUntil) return
    if (isCovered(extent)) return

    const lats: string[] = []
    const lons: string[] = []
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const fy = INSET + (1 - 2 * INSET) * (row / (GRID - 1))
        const fx = INSET + (1 - 2 * INSET) * (col / (GRID - 1))
        // Clamped: a map panned past a pole or across the date line would ask
        // for coordinates the API rejects, and take the whole grid down.
        lats.push(Math.min(85, Math.max(-85, south + spanLat * fy)).toFixed(4))
        lons.push(Math.min(180, Math.max(-180, west + spanLon * fx)).toFixed(4))
      }
    }

    // A pan that outruns its own request would otherwise paint the old extent's
    // arrows over the new one, in whichever order the answers happen to land.
    inFlight?.abort()
    inFlight = new AbortController()
    loading.value = true

    try {
      const url = 'https://api.open-meteo.com/v1/forecast'
        + `?latitude=${lats.join(',')}`
        + `&longitude=${lons.join(',')}`
        + '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m'
        + '&wind_speed_unit=kmh'

      const res = await fetch(url, { signal: inFlight.signal })
      if (res.status === 429) {
        // Out of quota for the hour. Retrying sooner just burns more of it.
        blockedUntil = Date.now() + COOLDOWN_MS
        return
      }
      if (!res.ok) return

      const data = await res.json()
      const rows = Array.isArray(data) ? data : [data]

      points.value = rows.flatMap((row: any): WindPoint[] => {
        const dir = Number(row?.current?.wind_direction_10m)
        const speed = Number(row?.current?.wind_speed_10m)
        if (!Number.isFinite(dir) || !Number.isFinite(speed)) return []
        return [{
          lat: Number(row.latitude),
          lon: Number(row.longitude),
          direction: dir,
          speed,
          gust: Number(row?.current?.wind_gusts_10m) || speed
        }]
      })

      // Only after a good answer, so a failed fetch does not mark the extent as
      // covered and leave the map showing the wrong field until the cache ages.
      fetchedExtent = extent
      fetchedAt = Date.now()
    } catch {
      // Aborted, offline, or malformed. The previous field stays on screen,
      // which is a better answer than clearing the map to show a failure.
    } finally {
      loading.value = false
    }
  }

  const cancel = () => {
    inFlight?.abort()
    inFlight = null
  }

  return { points, grid, loading, fetchField, cancel }
}
