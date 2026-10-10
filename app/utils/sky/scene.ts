/**
 * The sky view's Three.js scene. `SkyView.vue` loads this file with `import()`
 * when the overlay opens, so Three.js never enters the solar page's first
 * download (spec rule 4). It knows nothing about Vue.
 *
 * It holds the camera and its controls, the stars, the globe group that
 * carries the planet looks, and the layers drawn in the place's own frame.
 * Spec sections 7 and 8.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import gsap from 'gsap'
import { worldToLatLng, type Quat } from '../globeMath'
import { PLANET_RADIUS, skyDirection, type BowMode, type SkyModel, type SkySample } from '../skyGeometry'
import { createStars } from './stars'
import { createEarth } from './planetEarth'
import type { Planet, SkyLayer } from './types'

export type PlanetMode = 'earth' | 'dots'
export type { BowMode }

export interface SkySceneOptions {
  canvas: HTMLCanvasElement
  /** An element laid exactly over the canvas, for the HTML labels. */
  labelLayer: HTMLElement
  reducedMotion: boolean
}

export interface SkyScene {
  setModel(model: SkyModel, orientation: Quat, opts: { animate: boolean }): void
  setBow(mode: BowMode, opts: { animate: boolean }): void
  /** Resolves once the look is showing; rejects when its images cannot load. */
  setPlanet(mode: PlanetMode, opts: { animate: boolean }): Promise<void>
  /** The sun for the current model, with that model's globe orientation. */
  setSun(sun: SkySample, orientation: Quat): void
  onPick(handler: (lat: number, lng: number) => void): void
  playIntro(): void
  resize(): void
  dispose(): void
}

type PlanetFactory = (renderer: THREE.WebGLRenderer) => Promise<Planet>

/** The planet looks this scene can build. A look not listed simply does not appear. */
const PLANET_FACTORIES: Partial<Record<PlanetMode, PlanetFactory>> = { earth: createEarth }

const DEG = Math.PI / 180
const CAMERA_DISTANCE = 3.2
const CAMERA_ELEVATION = 22 * DEG
/** Half the width that must stay in view: the bow, its labels and a margin. */
const FIT_HALF_WIDTH = 1.6
const TAP_SLOP_PX = 6
const TAP_MAX_MS = 350
const MORPH_SECONDS = 1.2
const PLACE_SECONDS = 1.4
const PLANET_FADE_SECONDS = 0.6
const REDUCED_FADE_SECONDS = 0.2
const INTRO_SPIN = 25 * DEG

export const createSkyScene = ({ canvas, labelLayer, reducedMotion }: SkySceneOptions): SkyScene => {
  // Throws where WebGL is unavailable. SkyView catches it and shows its note.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const labels = new CSS2DRenderer({ element: labelLayer })
  const ctx = gsap.context(() => {})
  const animate = (make: () => void) => {
    ctx.add(make)
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minPolarAngle = 0.15
  // Low enough to look up at the blue fans, never under the planet.
  controls.maxPolarAngle = Math.PI * 0.62

  const stars = createStars(renderer.getPixelRatio())
  scene.add(stars.object)

  // `spinner` carries the opening turn and rise; `globe` carries the place.
  const spinner = new THREE.Group()
  const globe = new THREE.Group()
  spinner.add(globe)
  scene.add(spinner)

  const layers: SkyLayer[] = []
  for (const layer of layers) scene.add(layer.object)

  const planets: Partial<Record<PlanetMode, Planet>> = {}
  const planetFade: Record<PlanetMode, { value: number }> = { earth: { value: 0 }, dots: { value: 0 } }
  const planetRise = { value: 1 }
  let planetRequest = 0

  // The sun is kept in the globe's own frame and turned into world space each
  // frame, so the day/night line rolls with the planet when the place changes.
  const sunInGlobe = new THREE.Vector3(0, 1, 0)
  const sunInWorld = new THREE.Vector3(0, 1, 0)
  const globeWorld = new THREE.Quaternion()

  let model: SkyModel | null = null
  let bowMode: BowMode = 'sky'
  let disposed = false
  let rollTween: gsap.core.Tween | null = null
  let swingTween: gsap.core.Tween | null = null
  let fadeTimeline: gsap.core.Timeline | null = null
  let intro: gsap.core.Timeline | null = null
  const layerFade = { value: 1 }

  // --- Camera -------------------------------------------------------------

  /** From the pole side, towards the equator: the bow leans away and both horizons show. */
  const cameraDirection = (southern: boolean) =>
    new THREE.Vector3(0, Math.sin(CAMERA_ELEVATION), (southern ? 1 : -1) * Math.cos(CAMERA_ELEVATION))

  /** Keep the bow's whole width in view; on an upright phone, pull back and centre the planet. */
  const fit = (direction = camera.position.clone().sub(controls.target).normalize()) => {
    const aspect = camera.aspect
    const target = new THREE.Vector3(0, aspect >= 1 ? PLANET_RADIUS + 0.35 : PLANET_RADIUS - 0.35, 0)
    const distance = Math.max(CAMERA_DISTANCE, FIT_HALF_WIDTH / (Math.tan((camera.fov * DEG) / 2) * aspect))
    controls.target.copy(target)
    controls.minDistance = Math.min(2.2, distance * 0.7)
    controls.maxDistance = Math.max(6, distance * 1.6)
    camera.position.copy(target).addScaledVector(direction, distance)
    controls.update()
  }

  /** Swing round to the other pole's side when the place crosses the equator. */
  const swingCamera = (southern: boolean, duration: number) => {
    swingTween?.kill()
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target))
    const goal = southern ? 0 : Math.PI
    const delta = Math.atan2(Math.sin(goal - spherical.theta), Math.cos(goal - spherical.theta))
    const place = (theta: number) => {
      spherical.theta = theta
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical))
    }
    if (duration <= 0) {
      place(spherical.theta + delta)
      return
    }
    const swing = { theta: spherical.theta }
    animate(() => {
      swingTween = gsap.to(swing, {
        theta: spherical.theta + delta,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => place(swing.theta)
      })
    })
  }

  // --- Picking ------------------------------------------------------------

  let pickHandler: ((lat: number, lng: number) => void) | null = null
  let press: { x: number; y: number; t: number } | null = null
  const raycaster = new THREE.Raycaster()
  const planetSphere = new THREE.Sphere(new THREE.Vector3(), PLANET_RADIUS)
  const pointer = new THREE.Vector2()

  const onPointerDown = (event: PointerEvent) => {
    // A second finger makes it a pinch, and a pinch is never a pick.
    press = event.isPrimary ? { x: event.clientX, y: event.clientY, t: performance.now() } : null
  }
  const onPointerUp = (event: PointerEvent) => {
    const start = press
    press = null
    if (!start || !pickHandler || !event.isPrimary) return
    // A drag turns the view; only a short, still press picks (spec 6.5).
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP_PX) return
    if (performance.now() - start.t > TAP_MAX_MS) return
    const rect = canvas.getBoundingClientRect()
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.ray.intersectSphere(planetSphere, new THREE.Vector3())
    if (!hit) return
    globe.getWorldQuaternion(globeWorld)
    const { lat, lng } = worldToLatLng([hit.x, hit.y, hit.z], [globeWorld.x, globeWorld.y, globeWorld.z, globeWorld.w])
    pickHandler(lat, lng)
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)

  // --- Loop ---------------------------------------------------------------

  let last = performance.now()
  let time = 0
  const frame = () => {
    const now = performance.now()
    // Frozen under reduced motion: shimmer, breathing and twinkle all stop.
    if (!reducedMotion) time += Math.min((now - last) / 1000, 0.1)
    last = now
    controls.update()
    globe.getWorldQuaternion(globeWorld)
    sunInWorld.copy(sunInGlobe).applyQuaternion(globeWorld)
    for (const mode of ['earth', 'dots'] as const) {
      const planet = planets[mode]
      if (!planet) continue
      const alpha = planetFade[mode].value * planetRise.value
      planet.object.visible = alpha > 0.001
      planet.setOpacity(alpha)
      planet.setSunDirection(sunInWorld)
      planet.update(time)
    }
    stars.update(time)
    for (const layer of layers) layer.update(time)
    renderer.render(scene, camera)
    labels.render(scene, camera)
  }
  const onVisibility = () => {
    last = performance.now()
    renderer.setAnimationLoop(document.hidden ? null : frame)
  }
  document.addEventListener('visibilitychange', onVisibility)
  renderer.setAnimationLoop(frame)

  // --- API ----------------------------------------------------------------

  const applyLayerFade = () => {
    for (const layer of layers) layer.setOpacity(layerFade.value)
  }
  /** Reduced motion: fade out, swap, fade in, instead of gliding. */
  const crossfade = (swap: () => void) => {
    fadeTimeline?.kill()
    animate(() => {
      fadeTimeline = gsap
        .timeline()
        .to(layerFade, { value: 0, duration: REDUCED_FADE_SECONDS / 2, onUpdate: applyLayerFade })
        .add(swap)
        .to(layerFade, { value: 1, duration: REDUCED_FADE_SECONDS / 2, onUpdate: applyLayerFade })
    })
  }

  const resize = () => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    labels.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    for (const layer of layers) layer.setResolution(width, height, renderer.getPixelRatio())
    fit()
  }

  const setModel: SkyScene['setModel'] = (next, orientation, { animate: animated }) => {
    const first = model === null
    const flipped = !first && model!.southern !== next.southern
    model = next
    const goal = new THREE.Quaternion(...orientation)
    if (first || !animated) {
      rollTween?.kill()
      globe.quaternion.copy(goal)
      for (const layer of layers) layer.setModel(next, 0)
      if (first) fit(cameraDirection(next.southern))
      else if (flipped) swingCamera(next.southern, 0)
      return
    }
    if (reducedMotion) {
      crossfade(() => {
        globe.quaternion.copy(goal)
        for (const layer of layers) layer.setModel(next, 0)
        if (flipped) swingCamera(next.southern, 0)
      })
      return
    }
    rollTween?.kill()
    const from = globe.quaternion.clone()
    const roll = { t: 0 }
    animate(() => {
      rollTween = gsap.to(roll, {
        t: 1,
        duration: PLACE_SECONDS,
        ease: 'power2.inOut',
        onUpdate: () => {
          globe.quaternion.slerpQuaternions(from, goal, roll.t)
        }
      })
    })
    for (const layer of layers) layer.setModel(next, PLACE_SECONDS)
    if (flipped) swingCamera(next.southern, PLACE_SECONDS)
  }

  const setBow: SkyScene['setBow'] = (mode, { animate: animated }) => {
    bowMode = mode
    if (animated && reducedMotion) {
      crossfade(() => {
        for (const layer of layers) layer.setMode(bowMode, 0)
      })
      return
    }
    for (const layer of layers) layer.setMode(mode, animated ? MORPH_SECONDS : 0)
  }

  const setSun: SkyScene['setSun'] = (sun, orientation) => {
    const inverse = new THREE.Quaternion(...orientation).invert()
    sunInGlobe.set(...skyDirection(sun.az, sun.alt)).applyQuaternion(inverse)
    for (const layer of layers) layer.setSun(sun)
  }

  const setPlanet: SkyScene['setPlanet'] = async (mode, { animate: animated }) => {
    const request = ++planetRequest
    if (!planets[mode]) {
      const factory = PLANET_FACTORIES[mode]
      if (!factory) return
      const built = await factory(renderer) // rejects when the images cannot load
      if (disposed || planets[mode]) {
        built.dispose()
        if (disposed) return
      } else {
        planets[mode] = built
        globe.add(built.object)
      }
    }
    if (request !== planetRequest) return // a newer choice won
    const duration = animated ? (reducedMotion ? REDUCED_FADE_SECONDS : PLANET_FADE_SECONDS) : 0
    for (const key of ['earth', 'dots'] as const) {
      const fade = planetFade[key]
      const goal = key === mode ? 1 : 0
      gsap.killTweensOf(fade)
      if (duration === 0) fade.value = goal
      else animate(() => gsap.to(fade, { value: goal, duration, ease: 'power1.inOut' }))
    }
  }

  const playIntro = () => {
    if (reducedMotion) return
    intro?.kill()
    spinner.rotation.y = INTRO_SPIN
    spinner.scale.setScalar(0.94)
    planetRise.value = 0
    animate(() => {
      intro = gsap.timeline()
      intro.to(spinner.rotation, { y: 0, duration: 1.2, ease: 'power3.out' }, 0)
      intro.to(spinner.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power3.out' }, 0)
      intro.to(planetRise, { value: 1, duration: 1.0, ease: 'power1.out' }, 0)
      for (const layer of layers) layer.intro(intro)
    })
  }

  const dispose = () => {
    disposed = true
    renderer.setAnimationLoop(null)
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointerup', onPointerUp)
    ctx.kill()
    controls.dispose()
    stars.dispose()
    for (const planet of Object.values(planets)) planet?.dispose()
    for (const layer of layers) layer.dispose()
    labelLayer.replaceChildren()
    renderer.dispose()
    renderer.forceContextLoss()
  }

  camera.position.copy(cameraDirection(false)).multiplyScalar(CAMERA_DISTANCE)
  resize()

  return {
    setModel,
    setBow,
    setPlanet,
    setSun,
    onPick: (handler) => {
      pickHandler = handler
    },
    playIntro,
    resize,
    dispose
  }
}
