/**
 * The dot globe: land as a field of small dots in the app's petrol, lit by the
 * same sun, with the golden and blue bands lighting the dots they cross
 * (spec 7.4).
 */
import * as THREE from 'three'
import { BAND_GLSL, bandUniform } from './bands'
import { PALETTE } from './palette'
import type { Planet } from './types'

const CANDIDATES = 40_000
const DOT_RADIUS = 1.002
const RAD = 180 / Math.PI

/**
 * The land mask as a lookup. Without it - a first opening while offline -
 * every point counts as land, so the globe still appears, as a full sphere.
 */
const loadLandLookup = async (): Promise<(lat: number, lng: number) => boolean> => {
  try {
    const image = new Image()
    image.src = '/textures/land-mask.png'
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })!
    context.drawImage(image, 0, 0)
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height)
    return (lat, lng) => {
      const x = Math.min(width - 1, Math.floor(((lng + 180) / 360) * width))
      const y = Math.min(height - 1, Math.floor(((90 - lat) / 180) * height))
      return data[(y * width + x) * 4]! > 127
    }
  } catch {
    return () => true
  }
}

const DOT_VERTEX = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vSin;
  void main() {
    vSin = dot(normalize(mat3(modelMatrix) * position), uSunDir);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Shrinks with distance all the way down, so a small globe on a phone
    // keeps the gaps between its dots instead of closing into a solid mass.
    gl_PointSize = uSize * uPixelRatio * clamp(3.2 / -mv.z, 0.3, 1.4);
    gl_Position = projectionMatrix * mv;
  }`

const DOT_FRAGMENT = /* glsl */ `
  uniform vec3 uDay;
  uniform vec3 uNight;
  uniform vec3 uGolden;
  uniform vec3 uBlue;
  uniform vec4 uBands;
  uniform float uOpacity;
  varying float vSin;
  ${BAND_GLSL}
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float edge = smoothstep(0.5, 0.3, d);
    float light = smoothstep(-0.12, 0.1, vSin);
    vec3 color = mix(uNight, uDay * (0.75 + 0.7 * clamp(vSin, 0.0, 1.0)), light);
    color = mix(color, uGolden, 0.8 * band(vSin, uBands.y, uBands.x));
    color = mix(color, uBlue, 0.75 * band(vSin, uBands.w, uBands.z));
    gl_FragColor = vec4(color, edge * uOpacity);
    #include <colorspace_fragment>
  }`

export const createDots = async (renderer: THREE.WebGLRenderer): Promise<Planet> => {
  const isLand = await loadLandLookup()
  const positions: number[] = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < CANDIDATES; i++) {
    const y = 1 - (2 * (i + 0.5)) / CANDIDATES
    const r = Math.sqrt(1 - y * y)
    const x = Math.cos(goldenAngle * i) * r
    const z = Math.sin(goldenAngle * i) * r
    // The globe's model frame (spec 4.1): latitude from y, longitude from x and −z.
    if (isLand(Math.asin(y) * RAD, Math.atan2(-z, x) * RAD)) {
      positions.push(x * DOT_RADIUS, y * DOT_RADIUS, z * DOT_RADIUS)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  const sun = new THREE.Vector3(0, 1, 0)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: sun },
      uSize: { value: 4.5 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uDay: { value: new THREE.Color(PALETTE.dotsDay) },
      uNight: { value: new THREE.Color(PALETTE.dotsNight) },
      uGolden: { value: new THREE.Color(PALETTE.golden) },
      uBlue: { value: new THREE.Color(PALETTE.blue) },
      uBands: { value: bandUniform() },
      uOpacity: { value: 1 }
    },
    vertexShader: DOT_VERTEX,
    fragmentShader: DOT_FRAGMENT,
    transparent: true,
    depthWrite: false
  })
  const dots = new THREE.Points(geometry, material)
  dots.renderOrder = 1

  // A dark core hides the far side's dots.
  const coreMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.dotsCore, transparent: true })
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.995, 64, 32), coreMaterial)
  core.renderOrder = 0

  const group = new THREE.Group()
  group.add(core, dots)

  return {
    object: group,
    setSunDirection: (direction) => {
      sun.copy(direction)
    },
    setOpacity: (alpha) => {
      material.uniforms.uOpacity!.value = alpha
      coreMaterial.opacity = alpha
    },
    update: () => {},
    dispose: () => {
      geometry.dispose()
      material.dispose()
      core.geometry.dispose()
      coreMaterial.dispose()
    }
  }
}
