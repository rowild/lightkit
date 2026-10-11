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
import { PALETTE, beadColor, coronaColor, sunColor } from './palette'
import { coronaTexture, discTexture, glowTexture, raysTexture } from './textures'
import type { SkyLayer } from './types'

/** Room for every full hour of a span, with a spare. */
const BEAD_SLOTS = 26

/** The eclipsed sun's disc, a little smaller than the day sun's core glow. */
const ECLIPSE_DISC = 0.2
/** The corona sprite; its bright edge sits exactly on the disc's rim. */
const CORONA_SIZE = 0.66
/** The black glow round the eclipse, and how much light it swallows. */
const SHADE_SIZE = 1.3
const SHADE_OPACITY = 0.8
/** Faint streamers turning slowly the other way from the day sun's rays. */
const STREAMER_SIZE = 0.95
const STREAMER_OPACITY = 0.16

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
  let sunUp = 1
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

  // The sun. Up: a core, a breathing halo and slow rays. Down, on either bow:
  // an eclipse - a dark disc in a black glow that swallows the light behind it,
  // rimmed by a thin corona whose colour says how deep the sun has sunk.
  const glow = glowTexture()
  const rays = raysTexture()
  const disc = discTexture()
  const corona = coronaTexture(ECLIPSE_DISC / CORONA_SIZE)
  const sprite = (map: THREE.Texture, size: number, blending: THREE.Blending, order: number) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending }))
    s.scale.setScalar(size)
    s.renderOrder = order
    return s
  }
  const halo = sprite(glow, 0.9, THREE.AdditiveBlending, 6)
  const sunRays = sprite(rays, 1.0, THREE.AdditiveBlending, 6)
  const core = sprite(glow, 0.24, THREE.AdditiveBlending, 6)
  // Drawn after the fans, the path and the beads, so it can darken them. Normal
  // blending, because adding black adds nothing: darkness has to cover light.
  const shade = sprite(glow, SHADE_SIZE, THREE.NormalBlending, 6.1)
  shade.material.color.set(0x000000)
  const eclipse = sprite(disc, ECLIPSE_DISC, THREE.NormalBlending, 6.2)
  eclipse.material.color.set(PALETTE.eclipse)
  const coronaGlow = sprite(corona, CORONA_SIZE, THREE.AdditiveBlending, 6.3)
  // Before the disc, so its face stays black; after the shade, so they still shine.
  const streamers = sprite(rays, STREAMER_SIZE, THREE.AdditiveBlending, 6.15)
  const sun = new THREE.Group()
  sun.add(halo, sunRays, core, shade, eclipse, coronaGlow, streamers)
  group.add(sun)

  // Everything that glides.
  const beadPosition = new Morph(BEAD_SLOTS * 3)
  const beadTint = new Morph(BEAD_SLOTS * 3)
  const beadSize = new Morph(BEAD_SLOTS)
  const sunPosition = new Morph(3)
  /** r, g, b, and how far the sun is up: 1 above the horizon, 0 eclipsed below it. */
  const sunState = new Morph(4)
  /** The corona's r, g, b, already multiplied by its strength. */
  const coronaState = new Morph(3)

  const write = () => {
    ;(positionAttribute.array as Float32Array).set(beadPosition.current)
    ;(colorAttribute.array as Float32Array).set(beadTint.current)
    ;(sizeAttribute.array as Float32Array).set(beadSize.current)
    positionAttribute.needsUpdate = true
    colorAttribute.needsUpdate = true
    sizeAttribute.needsUpdate = true
    sun.position.fromArray(sunPosition.current)
    const [r, g, b, up] = sunState.current
    for (const s of [halo, sunRays, core]) s.material.color.setRGB(r!, g!, b!)
    sunUp = up!
    const [cr, cg, cb] = coronaState.current
    for (const s of [coronaGlow, streamers]) s.material.color.setRGB(cr!, cg!, cb!)
  }
  const runner = createMorphRunner([beadPosition, beadTint, beadSize, sunPosition, sunState, coronaState], write)

  const sunTargets = () => {
    if (!model || !sample) return null
    sunColor(sample.alt, color)
    // The same on both bows: on the clock too, a dark sun means it is night.
    const up = THREE.MathUtils.smoothstep(sample.alt, -1.5, 1)
    const state = [color.r, color.g, color.b, up]
    coronaColor(sample.alt, color)
    return {
      position: layoutPoint(sample, mode, model.southern),
      state,
      corona: [color.r, color.g, color.b]
    }
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
      coronaState.retarget(target.corona)
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
        coronaState.aim(target.corona)
      } else {
        sunPosition.retarget(target.position)
        sunState.retarget(target.state)
        coronaState.retarget(target.corona)
        sunPosition.apply(1)
        sunState.apply(1)
        coronaState.apply(1)
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
      const breath = Math.sin((time * Math.PI * 2) / 4)
      sun.scale.setScalar(Math.max(1e-4, reveal.sun))
      halo.scale.setScalar(0.9 * (1 + 0.04 * breath))
      sunRays.material.rotation = time * 0.05
      core.material.opacity = sunUp * shown
      halo.material.opacity = 0.55 * sunUp * shown
      sunRays.material.opacity = 0.2 * sunUp * shown
      // The corona breathes in brightness, not size, so it stays on the disc's edge.
      const down = (1 - sunUp) * shown
      shade.material.opacity = SHADE_OPACITY * down
      eclipse.material.opacity = down
      coronaGlow.material.opacity = (0.9 + 0.1 * breath) * down
      streamers.material.rotation = -time * 0.03
      streamers.material.opacity = STREAMER_OPACITY * down
    },
    dispose() {
      runner.kill()
      disposeTree(group)
      glow.dispose()
      rays.dispose()
      disc.dispose()
      corona.dispose()
    }
  }
}
