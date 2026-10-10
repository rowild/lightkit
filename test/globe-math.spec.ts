import { describe, it, expect } from 'vitest'
import { Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three'
import {
  latLngToModel,
  localFrame,
  orientationFor,
  rotate,
  worldToLatLng,
  type Vec3
} from '~/utils/globeMath'

const PLACES: Record<string, [number, number]> = {
  reykjavik: [64.1466, -21.9426],
  quito: [-0.18, -78.47],
  sydney: [-33.87, 151.21],
  antimeridianEast: [10, 179.9],
  antimeridianWest: [-10, -179.9],
  nearNorthPole: [89.5, 40],
  nearSouthPole: [-89.5, -120]
}

const expectVec = (actual: Vec3, expected: Vec3, digits = 9) => {
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, digits))
}
/** Two longitudes compared modulo 360. */
const lngGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180)
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
]

describe('latLngToModel', () => {
  // A tap lands on the right town only if this agrees with how Three.js wraps
  // the texture round the sphere, so it is checked against Three.js itself.
  it('agrees with every vertex of a real SphereGeometry', () => {
    const sphere = new SphereGeometry(1, 64, 32)
    const position = sphere.getAttribute('position')
    const uv = sphere.getAttribute('uv')
    for (let i = 0; i < position.count; i++) {
      const lat = uv.getY(i) * 180 - 90
      const lng = uv.getX(i) * 360 - 180
      expectVec(latLngToModel(lat, lng), [position.getX(i), position.getY(i), position.getZ(i)], 6)
    }
  })

  it('puts longitude 0 on +X, 90°E on −Z and the north pole on +Y', () => {
    expectVec(latLngToModel(0, 0), [1, 0, 0])
    expectVec(latLngToModel(0, 90), [0, 0, -1])
    expectVec(latLngToModel(90, 0), [0, 1, 0])
  })
})

describe('localFrame', () => {
  it('is orthonormal and right-handed as east, up, south', () => {
    for (const [lat, lng] of Object.values(PLACES)) {
      const { up, east, north } = localFrame(lat, lng)
      expect(dot(up, east)).toBeCloseTo(0, 12)
      expect(dot(up, north)).toBeCloseTo(0, 12)
      expect(dot(east, north)).toBeCloseTo(0, 12)
      expect(Math.hypot(...east)).toBeCloseTo(1, 12)
      expect(Math.hypot(...north)).toBeCloseTo(1, 12)
      // east × up = south, exactly as X × Y = Z.
      expectVec(cross(east, up), [-north[0], -north[1], -north[2]])
    }
  })

  it('points north towards the pole', () => {
    expect(localFrame(48.2, 16.37).north[1]).toBeGreaterThan(0)
  })
})

describe('orientationFor', () => {
  it('turns the place to +Y, its east to +X and its north to −Z', () => {
    for (const [lat, lng] of Object.values(PLACES)) {
      const q = orientationFor(lat, lng)
      const { up, east, north } = localFrame(lat, lng)
      expectVec(rotate(q, up), [0, 1, 0])
      expectVec(rotate(q, east), [1, 0, 0])
      expectVec(rotate(q, north), [0, 0, -1])
    }
  })

  it('is the rotation Three.js builds from the same basis', () => {
    for (const [lat, lng] of Object.values(PLACES)) {
      const { up, east, north } = localFrame(lat, lng)
      const matrix = new Matrix4()
        .makeBasis(new Vector3(...east), new Vector3(...up), new Vector3(...north).negate())
        .transpose()
      const expected = new Quaternion().setFromRotationMatrix(matrix)
      const q = orientationFor(lat, lng)
      // q and −q are the same rotation.
      const sign = Math.sign(q[0] * expected.x + q[1] * expected.y + q[2] * expected.z + q[3] * expected.w) || 1
      expectVec([q[0] * sign, q[1] * sign, q[2] * sign], [expected.x, expected.y, expected.z])
      expect(q[3] * sign).toBeCloseTo(expected.w, 9)
    }
  })
})

describe('worldToLatLng', () => {
  it('reads the place back from the top of the globe', () => {
    for (const [lat, lng] of Object.values(PLACES)) {
      const back = worldToLatLng([0, 1, 0], orientationFor(lat, lng))
      expect(back.lat).toBeCloseTo(lat, 6)
      expect(lngGap(back.lng, lng)).toBeLessThan(1e-6)
    }
  })

  it('reads any tapped place back, whatever place is on top', () => {
    const q = orientationFor(64.1466, -21.9426)
    for (const [lat, lng] of Object.values(PLACES)) {
      const back = worldToLatLng(rotate(q, latLngToModel(lat, lng)), q)
      expect(back.lat).toBeCloseTo(lat, 6)
      expect(lngGap(back.lng, lng)).toBeLessThan(1e-6)
    }
  })

  it('accepts a hit slightly off the surface, as a ray hit can be', () => {
    const back = worldToLatLng([0, 1.0004, 0], orientationFor(0, 0))
    expect(back.lat).toBeCloseTo(0, 6)
    expect(back.lng).toBeCloseTo(0, 6)
  })

  it('never returns NaN, and keeps longitude in (−180, 180]', () => {
    const q = orientationFor(0, 0)
    const points: Vec3[] = [
      rotate(q, [0, 1, 0]),
      rotate(q, [0, -1, 0]),
      rotate(q, [-1, 0, 0]),
      rotate(q, [-1, 0, 1e-12])
    ]
    for (const point of points) {
      const { lat, lng } = worldToLatLng(point, q)
      expect(Number.isFinite(lat)).toBe(true)
      expect(Number.isFinite(lng)).toBe(true)
      expect(lng).toBeGreaterThan(-180)
      expect(lng).toBeLessThanOrEqual(180)
    }
  })
})
