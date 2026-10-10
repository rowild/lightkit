/**
 * Every colour the sky view's scene uses, in one place. The stage is always
 * dark, so these are the dark-theme accents from main.css (spec 7.2).
 */
import * as THREE from 'three'
import type { SkyKind } from '../skyGeometry'

export const PALETTE = {
  golden: '#ffc257',
  blue: '#8cc0e6',
  structure: '#8fb6d6',
  pin: '#f3f6f5',
  dayAir: '#6fb4ff',
  duskAir: '#ff8a4a',
  dotsDay: '#42777b',
  dotsNight: '#193134',
  dotsCore: '#06100f',
  star: '#dbe9ff'
} as const

/** Path and bead colour for each kind of light. */
export const KIND_COLORS: Record<SkyKind, string> = {
  golden: PALETTE.golden,
  blue: PALETTE.blue,
  day: '#ffe2a8',
  twilight: '#c7b3d9',
  night: '#3e6a70'
}

/** How strongly each kind is drawn on the path. The light worth flying for leads. */
export const KIND_INTENSITY: Record<SkyKind, number> = {
  golden: 1,
  blue: 1,
  day: 0.7,
  twilight: 0.6,
  night: 0.3
}

const SUN_STOPS: ReadonlyArray<readonly [number, string]> = [
  [-6, '#ff5a3c'],
  [0, '#ff6a3c'],
  [6, '#ff9a3c'],
  [20, '#ffd27a'],
  [45, '#fff4e0']
]
const scratch = new THREE.Color()

/** The sun's colour at an altitude: white high up, deep orange on the horizon. */
export const sunColor = (alt: number, target = new THREE.Color()): THREE.Color => {
  const first = SUN_STOPS[0]!
  if (alt <= first[0]) return target.set(first[1])
  for (let i = 1; i < SUN_STOPS.length; i++) {
    const [a1, c1] = SUN_STOPS[i]!
    if (alt <= a1) {
      const [a0, c0] = SUN_STOPS[i - 1]!
      return target.set(c0).lerp(scratch.set(c1), (alt - a0) / (a1 - a0))
    }
  }
  return target.set(SUN_STOPS[SUN_STOPS.length - 1]![1])
}

const DAY_LOW = new THREE.Color('#ffd27a')
const DAY_HIGH = new THREE.Color('#fff4e0')

/** An hour bead's colour: white-gold by day, the window's colour in golden and blue hour. */
export const beadColor = (bead: { kind: SkyKind; strength: number }, target = new THREE.Color()): THREE.Color => {
  switch (bead.kind) {
    case 'day':
      return target.copy(DAY_LOW).lerp(DAY_HIGH, bead.strength)
    case 'night':
      return target.set(KIND_COLORS.night).multiplyScalar(0.6)
    default:
      return target.set(KIND_COLORS[bead.kind])
  }
}
