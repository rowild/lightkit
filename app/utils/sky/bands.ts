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

/** 1 inside [lo, hi], fading softly outside it. */
export const BAND_GLSL = /* glsl */ `
  float band(float x, float lo, float hi) {
    float soft = (hi - lo) * 0.45;
    return smoothstep(lo - soft, lo + soft * 0.3, x) * (1.0 - smoothstep(hi - soft * 0.3, hi + soft, x));
  }`
