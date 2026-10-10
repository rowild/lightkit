/**
 * The Earth look: NASA's Blue Marble by day, Black Marble city lights by
 * night, the golden and blue twilight bands, and a thin atmosphere (spec 7.3).
 */
import * as THREE from 'three'
import { BAND_GLSL, bandUniform } from './bands'
import { PALETTE } from './palette'
import type { Planet } from './types'

const loadTexture = async (loader: THREE.TextureLoader, url: string, renderer: THREE.WebGLRenderer) => {
  const texture = await loader.loadAsync(url)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return texture
}

const WORLD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`

const SURFACE_FRAGMENT = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform vec3 uSunDir;
  uniform vec3 uGolden;
  uniform vec3 uBlue;
  uniform vec3 uAir;
  uniform vec3 uDusk;
  uniform vec4 uBands;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  ${BAND_GLSL}
  void main() {
    vec3 n = normalize(vNormalW);
    // The sine of the sun's altitude at this point of the planet.
    float s = dot(n, uSunDir);
    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float light = smoothstep(-0.12, 0.10, s);
    vec3 lit = day * (0.2 + 1.05 * clamp(s * 1.4 + 0.15, 0.0, 1.0));
    float darkness = 1.0 - smoothstep(-0.2, 0.02, s);
    vec3 dark = day * 0.03 + night * vec3(1.0, 0.8, 0.55) * 1.5 * darkness;
    vec3 color = mix(dark, lit, light);
    color += uGolden * band(s, uBands.y, uBands.x) * 0.55;
    color += uBlue * band(s, uBands.w, uBands.z) * 0.5;
    // A thin bright limb on the lit side, warming along the day/night line.
    vec3 view = normalize(cameraPosition - vPosW);
    float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    float dusk = 1.0 - smoothstep(0.0, 0.3, abs(s));
    color += mix(uAir, uDusk, dusk) * rim * 0.45 * smoothstep(-0.25, 0.2, s);
    gl_FragColor = vec4(color, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

const AIR_FRAGMENT = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uAir;
  uniform vec3 uDusk;
  uniform float uOpacity;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    // Back faces point away from the camera: facing is 0 at the halo's outer
    // edge and grows towards the planet, which hides everything inside it.
    float facing = dot(n, normalize(vPosW - cameraPosition));
    float halo = pow(clamp(facing * 3.6, 0.0, 1.0), 1.6);
    float s = dot(n, uSunDir);
    float lit = smoothstep(-0.3, 0.25, s);
    float dusk = 1.0 - smoothstep(0.0, 0.32, abs(s + 0.04));
    vec3 color = mix(uAir, uDusk, dusk) * halo * (0.12 + 0.88 * lit) * uOpacity;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }`

export const createEarth = async (renderer: THREE.WebGLRenderer): Promise<Planet> => {
  const loader = new THREE.TextureLoader()
  const [day, night] = await Promise.all([
    loadTexture(loader, '/textures/earth-day.jpg', renderer),
    loadTexture(loader, '/textures/earth-night.jpg', renderer)
  ])
  const sun = new THREE.Vector3(0, 1, 0)
  const air = new THREE.Color(PALETTE.dayAir)
  const dusk = new THREE.Color(PALETTE.duskAir)

  const surfaceMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: day },
      uNight: { value: night },
      uSunDir: { value: sun },
      uGolden: { value: new THREE.Color(PALETTE.golden) },
      uBlue: { value: new THREE.Color(PALETTE.blue) },
      uAir: { value: air },
      uDusk: { value: dusk },
      uBands: { value: bandUniform() },
      uOpacity: { value: 1 }
    },
    vertexShader: WORLD_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
    transparent: true
  })
  const surface = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), surfaceMaterial)
  surface.renderOrder = 0

  const airMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: sun },
      uAir: { value: air },
      uDusk: { value: dusk },
      uOpacity: { value: 1 }
    },
    vertexShader: WORLD_VERTEX,
    fragmentShader: AIR_FRAGMENT,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.04, 96, 48), airMaterial)
  atmosphere.renderOrder = 1

  const group = new THREE.Group()
  group.add(surface, atmosphere)

  return {
    object: group,
    setSunDirection: (direction) => {
      sun.copy(direction)
    },
    setOpacity: (alpha) => {
      surfaceMaterial.uniforms.uOpacity!.value = alpha
      airMaterial.uniforms.uOpacity!.value = alpha
    },
    update: () => {},
    dispose: () => {
      surface.geometry.dispose()
      atmosphere.geometry.dispose()
      surfaceMaterial.dispose()
      airMaterial.dispose()
      day.dispose()
      night.dispose()
    }
  }
}
