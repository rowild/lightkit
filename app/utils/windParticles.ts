/**
 * The moving wind field.
 *
 * Particles are carried through an interpolated wind grid and leave fading
 * trails, the way earth.nullschool and Windy draw it. Written here rather than
 * pulled in: the only OpenLayers-compatible package (`ol-wind`) was last
 * published in April 2024 against `ol >= 6` while this app is on 10.10, and
 * every library in that family eats a GFS-shaped `{header, data}` grid that
 * Open-Meteo does not serve - so the adapter would have been ours to write and
 * maintain either way.
 *
 * **Particle speed is proportional to wind speed.** That is the reason the
 * layer exists. A field can point one way across a whole city and still differ
 * by 30 km/h across it, and a still arrow cannot say so; a particle that
 * crosses the screen in two seconds instead of twenty can.
 */

export interface WindSample {
  lat: number
  lon: number
  /** Degrees the wind blows FROM. */
  direction: number
  /** km/h */
  speed: number
}

export interface WindGrid {
  west: number
  south: number
  east: number
  north: number
  cols: number
  rows: number
  /** Eastward component, km/h, in the direction the wind BLOWS. */
  u: Float32Array
  /** Northward component, km/h, in the direction the wind BLOWS. */
  v: Float32Array
  maxSpeed: number
}

/** Metres per degree of latitude. Close enough for a visual effect. */
const M_PER_DEG = 111_320

/**
 * Seconds of real wind per second of animation. **The only thing that scales
 * the motion.**
 *
 * An earlier version normalised each field so its FASTEST particle crossed the
 * view in six seconds, whatever that speed happened to be - which made 10 km/h
 * look exactly like a thunderstorm, and made the apparent speed independent of
 * zoom. Both were wrong. A particle now moves at its own ground speed, sped up
 * by this constant and by nothing else, so:
 *
 *   - 40 km/h moves four times as fast as 10 km/h, on the same map;
 *   - zooming in makes the wind look faster, because more pixels cover the
 *     same kilometre, which is what really happens.
 *
 * At 90, a 10 km/h wind moves about 20px a second at city zoom - a drift you
 * have to watch to see - and 40 km/h moves 78px a second, which reads as
 * weather. 300 was tried first and a 10 km/h breeze still looked like a gale,
 * because it happened to match what the old broken normalisation produced.
 */
const TIME_LAPSE = 90

/**
 * The readable band, in pixels per second, for the FASTEST cell on screen.
 *
 * True ground speed alone is unwatchable at wide zoom: measured over Europe,
 * cells ranged 0.4 to 37.7 km/h and the fastest of them still needed 26 minutes
 * to cross the map. Everything looked equally frozen, which hides exactly the
 * differences this layer exists to show.
 *
 * So the whole field is scaled by ONE factor, chosen to bring its peak inside
 * this band. One factor for every particle is the point: the ratios between
 * them survive untouched, and a 40 km/h cell is still exactly four times a
 * 10 km/h cell on the same screen. Only the overall pace follows the zoom.
 *
 * At city zoom an ordinary wind already lands inside the band, so the factor is
 * ~1 and the motion is the honest ground speed. The correction only bites where
 * the honest answer is unusable.
 */
const MIN_PEAK_PX_PER_SEC = 25
const MAX_PEAK_PX_PER_SEC = 120

/**
 * Frames a particle lives before it is respawned, so the field keeps mixing.
 * Long, because at honest speeds a particle covers little ground in a second
 * and a short life would read as blinking dots rather than as flow.
 */
const MAX_AGE = 240

const SPEED_COLOURS = [
  { max: 15, stroke: '#5eb3e4' },
  { max: 25, stroke: '#f5b942' },
  { max: 40, stroke: '#f58a3c' },
  { max: Infinity, stroke: '#f2545b' }
]

/**
 * Turn the fetched points into a lattice of vectors.
 *
 * The points come back in the order they were asked for - row-major from the
 * south-west - so the index arithmetic here mirrors the loop that built the
 * request. `+180` is applied by taking the negative of each component: the API
 * reports the direction wind comes FROM, and everything drawn in this app
 * points the way it goes.
 */
export const buildWindGrid = (
  samples: WindSample[],
  cols: number,
  rows: number
): WindGrid | null => {
  if (samples.length !== cols * rows) return null

  const u = new Float32Array(cols * rows)
  const v = new Float32Array(cols * rows)
  let maxSpeed = 0
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity

  samples.forEach((sample, i) => {
    const rad = (sample.direction * Math.PI) / 180
    u[i] = -sample.speed * Math.sin(rad)
    v[i] = -sample.speed * Math.cos(rad)
    if (sample.speed > maxSpeed) maxSpeed = sample.speed
    if (sample.lon < west) west = sample.lon
    if (sample.lon > east) east = sample.lon
    if (sample.lat < south) south = sample.lat
    if (sample.lat > north) north = sample.lat
  })

  if (!(east > west) || !(north > south)) return null

  return { west, south, east, north, cols, rows, u, v, maxSpeed: Math.max(maxSpeed, 1) }
}

/** Bilinear sample of the grid. Returns km/h components in blow direction. */
export const sampleWind = (grid: WindGrid, lon: number, lat: number) => {
  const fx = ((lon - grid.west) / (grid.east - grid.west)) * (grid.cols - 1)
  const fy = ((lat - grid.south) / (grid.north - grid.south)) * (grid.rows - 1)

  const x0 = Math.max(0, Math.min(grid.cols - 1, Math.floor(fx)))
  const y0 = Math.max(0, Math.min(grid.rows - 1, Math.floor(fy)))
  const x1 = Math.min(grid.cols - 1, x0 + 1)
  const y1 = Math.min(grid.rows - 1, y0 + 1)
  const tx = Math.max(0, Math.min(1, fx - x0))
  const ty = Math.max(0, Math.min(1, fy - y0))

  const at = (arr: Float32Array, x: number, y: number) => arr[y * grid.cols + x]!
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const u = lerp(lerp(at(grid.u, x0, y0), at(grid.u, x1, y0), tx), lerp(at(grid.u, x0, y1), at(grid.u, x1, y1), tx), ty)
  const v = lerp(lerp(at(grid.v, x0, y0), at(grid.v, x1, y0), tx), lerp(at(grid.v, x0, y1), at(grid.v, x1, y1), tx), ty)
  return { u, v, speed: Math.hypot(u, v) }
}

interface Particle {
  lon: number
  lat: number
  px: number
  py: number
  age: number
}

export interface ParticleFieldOptions {
  /** The current grid, or null while nothing has been fetched yet. */
  getGrid: () => WindGrid | null
  /** Lon/lat -> [x, y] in CSS pixels, for the frame being drawn. */
  project: (lon: number, lat: number, frameState: any) => [number, number] | null
  /** Pixel -> lon/lat, used to seed particles inside the view. */
  unproject: (x: number, y: number, frameState: any) => [number, number] | null
}

/**
 * Draws one frame onto its own canvas and keeps the particle state between
 * frames. Knows nothing about OpenLayers beyond the two projection callbacks
 * it is handed, which is what makes it testable and replaceable.
 */
export const createParticleField = (options: ParticleFieldOptions) => {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'absolute'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.pointerEvents = 'none'
  const ctx = canvas.getContext('2d')!

  let particles: Particle[] = []
  let lastTime = 0
  let lastCenterKey = ''
  let width = 0
  let height = 0

  const seed = (p: Particle, frameState: any) => {
    const lonLat = options.unproject(Math.random() * width, Math.random() * height, frameState)
    if (!lonLat) return
    p.lon = lonLat[0]
    p.lat = lonLat[1]
    p.px = NaN
    p.py = NaN
    // Staggered, so the whole field does not blink out and back together.
    p.age = Math.floor(Math.random() * MAX_AGE)
  }

  const render = (frameState: any): HTMLCanvasElement => {
    const grid = options.getGrid()
    const [w, h] = frameState.size
    const ratio = frameState.pixelRatio

    // Resizing clears the canvas, so only do it when the size really changed -
    // otherwise every frame would wipe the trails it just drew.
    if (w !== width || h !== height) {
      width = w
      height = h
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      particles = []
    }

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

    // Trails are pixels drawn in a previous frame, so they belong to the view
    // that frame had. Any change of centre, zoom or rotation invalidates them.
    const view = frameState.viewState
    const centerKey = `${view.center[0]}|${view.center[1]}|${view.resolution}|${view.rotation}`
    if (centerKey !== lastCenterKey) {
      lastCenterKey = centerKey
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) { p.px = NaN; p.py = NaN }
    }

    if (!grid) return canvas

    const now = frameState.time || performance.now()
    // Capped: a backgrounded tab returns with a huge delta that would teleport
    // every particle off screen at once.
    const dt = Math.min(0.05, lastTime ? (now - lastTime) / 1000 : 0.016)
    lastTime = now

    const target = Math.min(900, Math.max(120, Math.round((w * h) / 1600)))
    while (particles.length < target) {
      const p: Particle = { lon: 0, lat: 0, px: NaN, py: NaN, age: 0 }
      seed(p, frameState)
      particles.push(p)
    }
    if (particles.length > target) particles.length = target

    // Fade what is already there by multiplying its alpha, rather than painting
    // a colour over it: the map has to stay visible underneath.
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.93)'
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'

    // One pace for the whole field, so every ratio inside it is preserved.
    // `resolution` is projected metres per pixel; Web Mercator stretches by
    // 1/cos(lat), so undo that to get real ground metres per pixel.
    const centreLat = (grid.north + grid.south) / 2
    const groundMetresPerPixel = Math.max(
      0.01,
      frameState.viewState.resolution * Math.cos((centreLat * Math.PI) / 180)
    )
    const peakMetresPerSecond = (grid.maxSpeed * 1000) / 3600
    const peakPxPerSecond = (peakMetresPerSecond * TIME_LAPSE) / groundMetresPerPixel

    let pace = TIME_LAPSE
    if (peakPxPerSecond > 0) {
      if (peakPxPerSecond < MIN_PEAK_PX_PER_SEC) pace *= MIN_PEAK_PX_PER_SEC / peakPxPerSecond
      else if (peakPxPerSecond > MAX_PEAK_PX_PER_SEC) pace *= MAX_PEAK_PX_PER_SEC / peakPxPerSecond
    }

    ctx.lineWidth = 1.3
    ctx.lineCap = 'round'

    for (const p of particles) {
      p.age += 1
      if (p.age > MAX_AGE) { seed(p, frameState); continue }

      const { u, v, speed } = sampleWind(grid, p.lon, p.lat)

      // This particle's own speed, at the field's shared pace, converted back
      // to degrees. Longitude is divided by cos(lat) so the drawn angle matches
      // the real bearing.
      const metres = pace * dt
      const dLat = (((v * 1000) / 3600) * metres) / M_PER_DEG
      const dLon = (((u * 1000) / 3600) * metres) / (M_PER_DEG * Math.cos((p.lat * Math.PI) / 180))

      const from = options.project(p.lon, p.lat, frameState)
      p.lon += dLon
      p.lat += dLat
      const to = options.project(p.lon, p.lat, frameState)

      if (!from || !to) { seed(p, frameState); continue }
      if (to[0] < -20 || to[0] > w + 20 || to[1] < -20 || to[1] > h + 20) { seed(p, frameState); continue }

      const band = SPEED_COLOURS.find(b => speed < b.max) ?? SPEED_COLOURS[SPEED_COLOURS.length - 1]!
      ctx.strokeStyle = band.stroke
      ctx.beginPath()
      ctx.moveTo(from[0], from[1])
      ctx.lineTo(to[0], to[1])
      ctx.stroke()

      p.px = to[0]
      p.py = to[1]
    }

    return canvas
  }

  const reset = () => {
    particles = []
    lastTime = 0
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return { canvas, render, reset }
}
