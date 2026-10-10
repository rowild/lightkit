/**
 * The sun's strengths: a bead at every full hour, sized and lit by how high
 * the sun stands then, and the sun itself at now or at solar noon
 * (spec 5.4, 5.5 and 7.5).
 */
import * as THREE from 'three'
import type gsap from 'gsap'
import { OBSERVER, layoutPoint, visibilityOnBow, type BowMode, type SkyModel, type SkySample } from '../skyGeometry'
import { disposeTree } from './dispose'
import { Morph, createMorphRunner } from './morph'
import { beadColor, sunColor } from './palette'
import { glowTexture, raysTexture, ringTexture } from './textures'
import type { SkyLayer } from './types'

/** Room for every full hour of a span, with a spare. */
const BEAD_SLOTS = 26

const BEAD_VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aF;
  uniform float uPixelRatio;
  uniform float uReveal;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // The opening lights the beads in time order.
    float shown = smoothstep(aF - 0.03, aF + 0.03, uReveal);
    vColor = aColor;
    vAlpha = shown * uOpacity;
    gl_PointSize = aSize * uPixelRatio * shown * clamp(3.2 / -mv.z, 0.55, 1.4);
    gl_Position = projectionMatrix * mv;
  }`

const BEAD_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.18, 0.0, d);
    float glow = pow(smoothstep(0.5, 0.0, d), 2.0);
    gl_FragColor = vec4(vColor, (core * 0.9 + glow * 0.6) * vAlpha);
    #include <colorspace_fragment>
  }`

export const createBeads = (): SkyLayer => {
  const group = new THREE.Group()
  const color = new THREE.Color()
  let model: SkyModel | null = null
  let mode: BowMode = 'sky'
  let sample: SkySample | null = null
  let opacity = 1
  let sunVisible = 1
  const reveal = { beads: 1, sun: 1 }

  // The beads.
  const attribute = (size: number) =>
    new THREE.BufferAttribute(new Float32Array(BEAD_SLOTS * size), size).setUsage(THREE.DynamicDrawUsage)
  const positionAttribute = attribute(3)
  const colorAttribute = attribute(3)
  const sizeAttribute = attribute(1)
  const shareAttribute = attribute(1)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', positionAttribute)
  geometry.setAttribute('aColor', colorAttribute)
  geometry.setAttribute('aSize', sizeAttribute)
  geometry.setAttribute('aF', shareAttribute)
  const material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 }, uReveal: { value: 2 }, uOpacity: { value: 1 } },
    vertexShader: BEAD_VERTEX,
    fragmentShader: BEAD_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const beads = new THREE.Points(geometry, material)
  beads.frustumCulled = false
  beads.renderOrder = 5
  group.add(beads)

  // The sun: a core, a breathing halo, slow rays, and a ring for when it is down.
  const glow = glowTexture()
  const rays = raysTexture()
  const ring = ringTexture()
  const sprite = (map: THREE.Texture, size: number) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    )
    s.scale.setScalar(size)
    s.renderOrder = 6
    return s
  }
  const halo = sprite(glow, 0.9)
  const sunRays = sprite(rays, 1.0)
  const core = sprite(glow, 0.24)
  const marker = sprite(ring, 0.12)
  const sun = new THREE.Group()
  sun.add(halo, sunRays, core, marker)
  group.add(sun)

  // Everything that glides.
  const beadPosition = new Morph(BEAD_SLOTS * 3)
  const beadTint = new Morph(BEAD_SLOTS * 3)
  const beadSize = new Morph(BEAD_SLOTS)
  const sunPosition = new Morph(3)
  /** r, g, b, and how visible the sun is (1 up, 0 down on the sky path). */
  const sunState = new Morph(4)

  const write = () => {
    ;(positionAttribute.array as Float32Array).set(beadPosition.current)
    ;(colorAttribute.array as Float32Array).set(beadTint.current)
    ;(sizeAttribute.array as Float32Array).set(beadSize.current)
    positionAttribute.needsUpdate = true
    colorAttribute.needsUpdate = true
    sizeAttribute.needsUpdate = true
    sun.position.fromArray(sunPosition.current)
    const [r, g, b, visible] = sunState.current
    for (const s of [halo, sunRays, core]) s.material.color.setRGB(r!, g!, b!)
    sunVisible = visible!
  }
  const runner = createMorphRunner([beadPosition, beadTint, beadSize, sunPosition, sunState], write)

  const sunTargets = () => {
    if (!model || !sample) return null
    sunColor(sample.alt, color)
    const visible = mode === 'clock' ? 1 : THREE.MathUtils.smoothstep(sample.alt, -1.5, 1)
    return { position: layoutPoint(sample, mode, model.southern), state: [color.r, color.g, color.b, visible] }
  }

  const retarget = (duration: number) => {
    if (!model) return
    const current = model
    const positions = new Float32Array(BEAD_SLOTS * 3)
    const tints = new Float32Array(BEAD_SLOTS * 3)
    const sizes = new Float32Array(BEAD_SLOTS)
    const shares = shareAttribute.array as Float32Array
    for (let i = 0; i < BEAD_SLOTS; i++) {
      const bead = current.beads[i]
      if (!bead) {
        // An empty slot: no size, never revealed.
        positions.set(OBSERVER, i * 3)
        shares[i] = 2
        continue
      }
      positions.set(layoutPoint(bead, mode, current.southern), i * 3)
      beadColor(bead, color).multiplyScalar(visibilityOnBow(bead.alt, mode))
      tints.set([color.r, color.g, color.b], i * 3)
      sizes[i] = bead.kind === 'night' ? 6 : 9 + 9 * bead.strength
      shares[i] = bead.f
    }
    shareAttribute.needsUpdate = true
    beadPosition.retarget(positions)
    beadTint.retarget(tints)
    beadSize.retarget(sizes)
    const target = sunTargets()
    if (target) {
      sunPosition.retarget(target.position)
      sunState.retarget(target.state)
    }
    runner.run(duration)
  }

  return {
    object: group,
    setModel(next, duration) {
      model = next
      retarget(duration)
    },
    setMode(next, duration) {
      mode = next
      retarget(duration)
    },
    setSun(next) {
      sample = next
      const target = sunTargets()
      if (!target) return
      // Mid-glide only the aim moves, so the sun is not thrown by the shared
      // progress; otherwise it steps to the new spot.
      if (runner.running) {
        sunPosition.aim(target.position)
        sunState.aim(target.state)
      } else {
        sunPosition.retarget(target.position)
        sunState.retarget(target.state)
        sunPosition.apply(1)
        sunState.apply(1)
        write()
      }
    },
    setOpacity(alpha) {
      opacity = alpha
    },
    setResolution(_width, _height, pixelRatio) {
      material.uniforms.uPixelRatio!.value = pixelRatio
    },
    intro(timeline: gsap.core.Timeline) {
      reveal.beads = 0
      reveal.sun = 0
      timeline.to(reveal, { beads: 1, duration: 0.8, ease: 'none' }, 1.4)
      timeline.to(reveal, { sun: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.0)
    },
    update(time) {
      material.uniforms.uReveal!.value = -0.05 + reveal.beads * 1.1
      material.uniforms.uOpacity!.value = opacity
      const shown = opacity * Math.min(1, reveal.sun)
      sun.scale.setScalar(Math.max(1e-4, reveal.sun))
      halo.scale.setScalar(0.9 * (1 + 0.04 * Math.sin((time * Math.PI * 2) / 4)))
      sunRays.material.rotation = time * 0.05
      core.material.opacity = sunVisible * shown
      halo.material.opacity = 0.55 * sunVisible * shown
      sunRays.material.opacity = 0.2 * sunVisible * shown
      marker.material.opacity = 0.4 * (1 - sunVisible) * shown
    },
    dispose() {
      runner.kill()
      disposeTree(group)
      glow.dispose()
      rays.dispose()
      ring.dispose()
    }
  }
}
