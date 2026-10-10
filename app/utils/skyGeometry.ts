/**
 * The sky view's day as plain data: the sun's path, the golden and blue
 * windows, the hour beads, and where each of them sits in the two bows.
 *
 * No Three.js and no browser API, so it is tested under node. It does no
 * astronomy of its own either: every altitude comes from `useSun`, and every
 * window from `getSolarSegments()`, so the sky view cannot disagree with the
 * Day Schedule bar (sky view spec, rule 2).
 */
import { useSun, SOLAR_ALTITUDES, type SolarSegment } from '../composables/useSun'
import type { Vec3 } from './globeMath'

export type BowMode = 'sky' | 'clock'
export type SkyKind = 'golden' | 'blue' | 'day' | 'twilight' | 'night'
export type WindowKind = 'golden' | 'blue' | 'day'

/** The fan slots, in time order. Each keeps a fixed place in the scene's buffers. */
export const WINDOW_NAMES = [
  'Morning Blue Hour',
  'Morning Golden Hour',
  'Daylight',
  'Evening Golden Hour',
  'Evening Blue Hour'
] as const
export type WindowName = (typeof WINDOW_NAMES)[number]

/** A fixed count, not a fixed step: two days always morph index by index. */
export const PATH_SAMPLES = 721
export const WINDOW_SAMPLES = 49
export const PLANET_RADIUS = 1
/** Bigger than the planet on purpose: the blue fans float clear of its curve (spec 5.7). */
export const BOW_RADIUS = 1.15
/** Where every fan starts: the selected place, on top of the planet. */
export const OBSERVER: Vec3 = [0, PLANET_RADIUS, 0]

export interface SkySample {
  /** Epoch milliseconds. */
  t: number
  /** Degrees above the horizon. */
  alt: number
  /** Compass degrees: 0 north, 90 east. */
  az: number
  /** Share of the span: 0 at the first nadir, 1 at the next. */
  f: number
  kind: SkyKind
}

export interface SkyWindow {
  name: WindowName
  kind: WindowKind
  start: Date
  end: Date
  /** WINDOW_SAMPLES samples from `start` to `end`, inclusive. */
  samples: SkySample[]
}

export interface SkyBead extends SkySample {
  /** `sin(alt)`, clamped: 0 below the horizon, 1 with the sun overhead. */
  strength: number
}

export interface SkyModel {
  lat: number
  lng: number
  /** South of the equator the camera and the clock bow face the other way. */
  southern: boolean
  spanStart: number
  spanEnd: number
  path: SkySample[]
  windows: SkyWindow[]
  beads: SkyBead[]
}

const DEG = Math.PI / 180
const HOUR = 3_600_000

const KIND_BY_SEGMENT: Record<string, SkyKind> = {
  'Morning Golden Hour': 'golden',
  'Evening Golden Hour': 'golden',
  'Morning Blue Hour': 'blue',
  'Evening Blue Hour': 'blue',
  'Daylight': 'day',
  'Civil Twilight Transition': 'twilight',
  'Night': 'night'
}

/** Only for a moment outside every segment. Inside one, the segment decides. */
const kindFromAltitude = (alt: number): SkyKind => {
  if (alt > SOLAR_ALTITUDES.goldenTop) return 'day'
  if (alt > SOLAR_ALTITUDES.horizon) return 'golden'
  if (alt > SOLAR_ALTITUDES.blueTop) return 'twilight'
  if (alt > SOLAR_ALTITUDES.blueBottom) return 'blue'
  return 'night'
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export const buildSkyModel = (date: Date, lat: number, lng: number): SkyModel => {
  const sun = useSun()
  const segments = sun.getSolarSegments(date, lat, lng)

  // The Day Schedule's span: nadir to the next nadir. Should SunCalc give no
  // segments at all, a day centred on the date keeps the bow drawable.
  const spanStart = segments[0]?.start.getTime() ?? date.getTime() - 12 * HOUR
  const spanEnd = segments.at(-1)?.end.getTime() ?? date.getTime() + 12 * HOUR
  const span = spanEnd - spanStart

  const segmentAt = (t: number): SolarSegment | undefined =>
    segments.find(s => t >= s.start.getTime() && t < s.end.getTime()) ??
    (t === spanEnd ? segments.at(-1) : undefined)

  const sample = (t: number, kind?: SkyKind): SkySample => {
    const { altitude, azimuth } = sun.getSunPosition(new Date(t), lat, lng)
    const segment = segmentAt(t)
    return {
      t,
      alt: altitude,
      az: azimuth,
      f: (t - spanStart) / span,
      kind: kind ?? (segment && KIND_BY_SEGMENT[segment.name]) ?? kindFromAltitude(altitude)
    }
  }

  const path = Array.from({ length: PATH_SAMPLES }, (_, i) =>
    sample(spanStart + (span * i) / (PATH_SAMPLES - 1))
  )

  const windows: SkyWindow[] = []
  for (const segment of segments) {
    if (!(WINDOW_NAMES as readonly string[]).includes(segment.name)) continue
    const name = segment.name as WindowName
    const kind = KIND_BY_SEGMENT[name] as WindowKind
    const start = segment.start.getTime()
    const end = segment.end.getTime()
    windows.push({
      name,
      kind,
      start: segment.start,
      end: segment.end,
      // Every sample carries the window's own kind. The one at `end` belongs
      // to the next segment by the segment rule, and would otherwise tint the
      // fan's last edge in the wrong colour.
      samples: Array.from({ length: WINDOW_SAMPLES }, (_, i) =>
        sample(start + ((end - start) * i) / (WINDOW_SAMPLES - 1), kind)
      )
    })
  }

  // Full hours of the device clock. Stepping in real hours from the first one
  // keeps every bead on a full hour across a daylight-saving change.
  const beads: SkyBead[] = []
  const firstHour = new Date(spanStart)
  firstHour.setMinutes(0, 0, 0)
  let t = firstHour.getTime() < spanStart ? firstHour.getTime() + HOUR : firstHour.getTime()
  for (; t <= spanEnd; t += HOUR) {
    const s = sample(t)
    beads.push({ ...s, strength: clamp01(Math.sin(s.alt * DEG)) })
  }

  return { lat, lng, southern: lat < 0, spanStart, spanEnd, path, windows, beads }
}

/** When the sun is drawn: now on today's date, solar noon on any other. */
export const sunTimeFor = (date: Date, lat: number, lng: number, now: Date): Date => {
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  return sameDay ? now : useSun().getSolarTimes(date, lat, lng).solarNoon
}

/** The sun at a moment, as a sample of this model. `f` stays inside the span. */
export const sunSample = (model: SkyModel, time: Date): SkySample => {
  const { altitude, azimuth } = useSun().getSunPosition(time, model.lat, model.lng)
  const f = clamp01((time.getTime() - model.spanStart) / (model.spanEnd - model.spanStart))
  const nearest = model.path[Math.round(f * (PATH_SAMPLES - 1))]!
  return { t: time.getTime(), alt: altitude, az: azimuth, f, kind: nearest.kind }
}

/** A compass bearing and altitude as a direction in the world frame (spec 4.3). */
export const skyDirection = (az: number, alt: number): Vec3 => {
  const a = az * DEG
  const h = alt * DEG
  return [Math.cos(h) * Math.sin(a), Math.sin(h), -Math.cos(h) * Math.cos(a)]
}

/** The default camera's right-hand direction: −X seen from the north, +X from the south. */
export const viewerRight = (southern: boolean): Vec3 => (southern ? [1, 0, 0] : [-1, 0, 0])

/** Sky path: the sun where it really stands, on a sphere round the place. */
export const skyPoint = (s: { alt: number; az: number }, radius = BOW_RADIUS): Vec3 => {
  const [x, y, z] = skyDirection(s.az, s.alt)
  return [OBSERVER[0] + radius * x, OBSERVER[1] + radius * y, OBSERVER[2] + radius * z]
}

/** Clock: the span bent into a half circle, morning on the viewer's left. */
export const clockPoint = (f: number, southern: boolean, radius = BOW_RADIUS): Vec3 => {
  const theta = Math.PI * (1 - f)
  const [rx, , rz] = viewerRight(southern)
  return [
    OBSERVER[0] + radius * Math.cos(theta) * rx,
    OBSERVER[1] + radius * Math.sin(theta),
    OBSERVER[2] + radius * Math.cos(theta) * rz
  ]
}

export const layoutPoint = (s: SkySample, mode: BowMode, southern: boolean, radius = BOW_RADIUS): Vec3 =>
  mode === 'sky' ? skyPoint(s, radius) : clockPoint(s.f, southern, radius)

/**
 * How much of a sample stays visible: all of it on the clock; on the sky path,
 * fading from the horizon to nothing at −18°, where night is full. The night
 * half of the path dissolves instead of cutting through the planet.
 */
export const visibilityOnBow = (alt: number, mode: BowMode): number =>
  mode === 'clock' || alt >= 0 ? 1 : Math.max(0, 1 + alt / 18)
