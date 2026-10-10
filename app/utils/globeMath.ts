/**
 * Where a place sits on the sky view's globe, and the turn that puts it on top.
 *
 * Plain arithmetic on tuples, no Three.js. `SkyView` needs these numbers before
 * the scene module has loaded, and Three.js has to stay out of the solar page's
 * first download. The conventions are section 4 of
 * docs/superpowers/specs/2026-10-10-sky-view-design.md.
 */

export type Vec3 = [number, number, number]
/** A unit quaternion as `[x, y, z, w]`, the order Three.js uses. */
export type Quat = [number, number, number, number]

const DEG = Math.PI / 180

/**
 * A place on the unit sphere, in the frame Three.js's default sphere UVs imply:
 * longitude 0 is +X, 90°E is −Z, 90°W is +Z and 180° is −X.
 */
export const latLngToModel = (lat: number, lng: number): Vec3 => {
  const phi = lat * DEG
  const lambda = lng * DEG
  return [Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)]
}

/** Up, east and north at a place, in the globe's model frame. */
export const localFrame = (lat: number, lng: number): { up: Vec3; east: Vec3; north: Vec3 } => {
  const phi = lat * DEG
  const lambda = lng * DEG
  return {
    up: latLngToModel(lat, lng),
    east: [-Math.sin(lambda), 0, -Math.cos(lambda)],
    north: [-Math.sin(phi) * Math.cos(lambda), Math.cos(phi), Math.sin(phi) * Math.sin(lambda)]
  }
}

/**
 * A quaternion from a rotation matrix given by its rows. Shepperd's method,
 * the one `Quaternion.setFromRotationMatrix` uses, so the two agree.
 */
const quatFromRows = (r0: Vec3, r1: Vec3, r2: Vec3): Quat => {
  const [m00, m01, m02] = r0
  const [m10, m11, m12] = r1
  const [m20, m21, m22] = r2
  const trace = m00 + m11 + m22
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1)
    return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s]
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22)
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22)
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11)
  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]
}

/**
 * The globe's rotation that carries a place to world +Y, its east to +X and
 * its north to −Z. The matrix's rows are east, up and south.
 */
export const orientationFor = (lat: number, lng: number): Quat => {
  const { up, east, north } = localFrame(lat, lng)
  const south: Vec3 = [-north[0], -north[1], -north[2]]
  return quatFromRows(east, up, south)
}

/** Rotate a vector by a unit quaternion. */
export const rotate = (q: Quat, v: Vec3): Vec3 => {
  const [qx, qy, qz, qw] = q
  const [x, y, z] = v
  const tx = 2 * (qy * z - qz * y)
  const ty = 2 * (qz * x - qx * z)
  const tz = 2 * (qx * y - qy * x)
  return [
    x + qw * tx + (qy * tz - qz * ty),
    y + qw * ty + (qz * tx - qx * tz),
    z + qw * tz + (qx * ty - qy * tx)
  ]
}

const conjugate = ([x, y, z, w]: Quat): Quat => [-x, -y, -z, w]

/**
 * The place under a world-space point on the globe, given the globe's current
 * rotation. Used when a tap lands on the planet.
 */
export const worldToLatLng = (point: Vec3, orientation: Quat): { lat: number; lng: number } => {
  const [x, y, z] = rotate(conjugate(orientation), point)
  const length = Math.hypot(x, y, z) || 1
  const lat = Math.asin(Math.min(1, Math.max(-1, y / length))) / DEG
  let lng = Math.atan2(-z, x) / DEG
  if (lng <= -180) lng += 360
  return { lat, lng }
}
