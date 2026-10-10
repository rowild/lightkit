/**
 * The golden and blue bands, as both planet shaders draw them. The altitudes
 * come from `SOLAR_ALTITUDES`, so the bands on the planet are exactly the
 * phases the Day Schedule names (spec rule 2).
 */
import * as THREE from 'three'
import { SOLAR_ALTITUDES } from '../../composables/useSun'

const DEG = Math.PI / 180

/** The four boundaries as sines of altitude, the form the shaders compare. */
export const bandUniform = () =>
  new THREE.Vector4(
    Math.sin(SOLAR_ALTITUDES.goldenTop * DEG),
    Math.sin(SOLAR_ALTITUDES.horizon * DEG),
    Math.sin(SOLAR_ALTITUDES.blueTop * DEG),
    Math.sin(SOLAR_ALTITUDES.blueBottom * DEG)
  )

/**
 * A soft bump over [lo, hi]: 1 in the middle, exactly half at lo and at hi,
 * nothing half a band-width outside. A glow with no hard edge, whose
 * half-brightness line still sits on the real phase boundary.
 */
export const BAND_GLSL = /* glsl */ `
  float band(float x, float lo, float hi) {
    float soft = (hi - lo) * 0.5;
    return smoothstep(lo - soft, lo + soft, x) * (1.0 - smoothstep(hi - soft, hi + soft, x));
  }`
