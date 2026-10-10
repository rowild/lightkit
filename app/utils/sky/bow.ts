/**
 * The bow: the sun's path, the fans from the place to the golden and blue
 * windows with a bright rim along each, the horizon ring and the pin
 * (spec 5.7, 7.5 and 7.7).
 */
import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import type gsap from 'gsap'
import {
  BOW_RADIUS,
  OBSERVER,
  PATH_SAMPLES,
  WINDOW_NAMES,
  WINDOW_SAMPLES,
  layoutPoint,
  visibilityOnBow,
  type BowMode,
  type SkyModel,
  type WindowName
} from '../skyGeometry'
import { disposeTree } from './dispose'
import { Morph, createMorphRunner } from './morph'
import { KIND_COLORS, KIND_INTENSITY, PALETTE, RIM_OPACITY } from './palette'
import { glowTexture } from './textures'
import type { SkyLayer } from './types'

const R = BOW_RADIUS
const O = new THREE.Vector3(...OBSERVER)
const FAN_TRIANGLES = WINDOW_SAMPLES - 1

const FAN_STYLE: Record<WindowName, { color: string; strength: number }> = {
  'Morning Blue Hour': { color: PALETTE.blue, strength: 0.6 },
  'Morning Golden Hour': { color: PALETTE.golden, strength: 0.75 },
  'Daylight': { color: PALETTE.structure, strength: 0.05 },
  'Evening Golden Hour': { color: PALETTE.golden, strength: 0.75 },
  'Evening Blue Hour': { color: PALETTE.blue, strength: 0.6 }
}

const FAN_VERTEX = /* glsl */ `
  attribute float aEdge;
  attribute float aAlong;
  uniform vec3 uOrigin;
  uniform float uReveal;
  varying float vEdge;
  varying float vAlong;
  void main() {
    vEdge = aEdge;
    vAlong = aAlong;
    // The opening unfolds every fan out of the pin.
    vec3 p = uOrigin + (position - uOrigin) * uReveal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`

const FAN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform float uOpacity;
  uniform float uTime;
  varying float vEdge;
  varying float vAlong;
  void main() {
    // Soft at the pin, bright at the bow.
    float body = pow(vEdge, 1.5);
    // Feather the two straight edges a touch, so they read as light, not paper.
    float sides = smoothstep(0.0, 0.035, vAlong) * smoothstep(1.0, 0.965, vAlong);
    // A slow shimmer travelling along the fan, and faint rays across it.
    float shimmer = 0.88 + 0.12 * sin(vAlong * 22.0 - uTime * 1.1 + vEdge * 5.0);
    float rays = 0.95 + 0.05 * sin(vAlong * 140.0 + sin(uTime * 0.3) * 2.0);
    gl_FragColor = vec4(uColor, body * sides * shimmer * rays * uStrength * uOpacity);
    #include <colorspace_fragment>
  }`

const makeLine = (points: number, width: number, color: string | null) => {
  const geometry = new LineGeometry()
  geometry.setPositions(new Float32Array(points * 3))
  if (color === null) geometry.setColors(new Float32Array(points * 3))
  const material = new LineMaterial({
    linewidth: width,
    color: color ?? 0xffffff,
    vertexColors: color === null,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    // Drops the round cap at each end of every segment. Added up at each
    // joint, the caps would string a dim line into beads; with no gap
    // (gapSize 0) the "dash" is simply the whole line.
    dashed: true,
    dashSize: 1,
    gapSize: 0
  })
  const line = new Line2(geometry, material)
  line.frustumCulled = false
  return { line, geometry, material }
}

/**
 * Write points (and colours) into a fat line's existing buffers. `setPositions`
 * would allocate new ones on every frame of a glide.
 */
const writeLine = (geometry: LineGeometry, points: Float32Array, colors?: Float32Array) => {
  const write = (name: 'instanceStart' | 'instanceColorStart', source: Float32Array) => {
    const attribute = geometry.getAttribute(name) as THREE.InterleavedBufferAttribute
    const array = attribute.data.array as Float32Array
    const segments = source.length / 3 - 1
    for (let i = 0; i < segments; i++) {
      array[i * 6] = source[i * 3]!
      array[i * 6 + 1] = source[i * 3 + 1]!
      array[i * 6 + 2] = source[i * 3 + 2]!
      array[i * 6 + 3] = source[i * 3 + 3]!
      array[i * 6 + 4] = source[i * 3 + 4]!
      array[i * 6 + 5] = source[i * 3 + 5]!
    }
    attribute.data.needsUpdate = true
  }
  write('instanceStart', points)
  if (colors) write('instanceColorStart', colors)
}

const makeFan = (name: WindowName) => {
  const positions = new Float32Array(FAN_TRIANGLES * 9)
  const edge = new Float32Array(FAN_TRIANGLES * 3)
  const along = new Float32Array(FAN_TRIANGLES * 3)
  for (let i = 0; i < FAN_TRIANGLES; i++) {
    edge.set([0, 1, 1], i * 3)
    along.set([(i + 0.5) / FAN_TRIANGLES, i / FAN_TRIANGLES, (i + 1) / FAN_TRIANGLES], i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1))
  geometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
  const style = FAN_STYLE[name]
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(style.color) },
      uStrength: { value: style.strength },
      uOpacity: { value: 1 },
      uReveal: { value: 1 },
      uOrigin: { value: O.clone() },
      uTime: { value: 0 }
    },
    vertexShader: FAN_VERTEX,
    fragmentShader: FAN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = 2
  return { name, mesh, positions, material }
}

/** One triangle (pin, Pᵢ, Pᵢ₊₁) per step along the window's rim. */
const writeFan = (fan: ReturnType<typeof makeFan>, rim: Float32Array) => {
  for (let i = 0; i < FAN_TRIANGLES; i++) {
    const o = i * 9
    fan.positions[o] = O.x
    fan.positions[o + 1] = O.y
    fan.positions[o + 2] = O.z
    fan.positions.set(rim.subarray(i * 3, i * 3 + 6), o + 3)
  }
  fan.mesh.geometry.getAttribute('position').needsUpdate = true
}

export const createBow = (): SkyLayer => {
  const group = new THREE.Group()
  const color = new THREE.Color()
  let model: SkyModel | null = null
  let mode: BowMode = 'sky'
  let opacity = 1
  const reveal = { path: 1, horizon: 1, fans: WINDOW_NAMES.map(() => ({ value: 1 })) }

  // The path.
  const path = makeLine(PATH_SAMPLES, 2, null)
  path.line.renderOrder = 3
  group.add(path.line)

  // The fans, and a bright rim along each golden and blue one.
  const fans = WINDOW_NAMES.map(makeFan)
  for (const fan of fans) group.add(fan.mesh)
  const rims = fans
    .filter(fan => fan.name !== 'Daylight')
    .map((fan) => {
      const rim = makeLine(WINDOW_SAMPLES, 3, FAN_STYLE[fan.name].color)
      rim.line.renderOrder = 4
      group.add(rim.line)
      return { slot: WINDOW_NAMES.indexOf(fan.name), ...rim }
    })

  // The horizon: a glass disc, its ring, and a tick every 15°.
  const ringPoints = Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2
    return new THREE.Vector3(O.x + R * Math.cos(a), O.y, O.z + R * Math.sin(a))
  })
  const ringMaterial = new THREE.LineBasicMaterial({ color: PALETTE.structure, transparent: true, depthWrite: false })
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPoints), ringMaterial)
  const tickPoints: THREE.Vector3[] = []
  for (let deg = 0; deg < 360; deg += 15) {
    const a = (deg * Math.PI) / 180
    const outer = deg % 90 === 0 ? 1.08 : 1.035
    tickPoints.push(
      new THREE.Vector3(O.x + R * Math.sin(a), O.y, O.z - R * Math.cos(a)),
      new THREE.Vector3(O.x + R * outer * Math.sin(a), O.y, O.z - R * outer * Math.cos(a))
    )
  }
  const tickMaterial = new THREE.LineBasicMaterial({ color: PALETTE.structure, transparent: true, depthWrite: false })
  const ticks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPoints), tickMaterial)
  const discMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.structure,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 96), discMaterial)
  disc.rotation.x = -Math.PI / 2
  disc.position.copy(O)
  for (const part of [ring, ticks, disc]) {
    part.renderOrder = 1
    group.add(part)
  }

  // The pin, with a ring pulsing outward every three seconds.
  const glow = glowTexture()
  const pinMaterial = new THREE.SpriteMaterial({
    map: glow,
    color: PALETTE.pin,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const pin = new THREE.Sprite(pinMaterial)
  pin.scale.setScalar(0.09)
  pin.position.copy(O)
  pin.renderOrder = 6
  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.pin,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  })
  const pulse = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.027, 48), pulseMaterial)
  pulse.rotation.x = -Math.PI / 2
  pulse.position.set(O.x, O.y + 0.003, O.z)
  pulse.renderOrder = 6
  const stemMaterial = new THREE.LineBasicMaterial({ color: PALETTE.pin, transparent: true, depthWrite: false })
  const stem = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([O.clone(), O.clone().add(new THREE.Vector3(0, 0.07, 0))]),
    stemMaterial
  )
  stem.renderOrder = 6
  group.add(pin, pulse, stem)

  // Everything that glides.
  const pathPosition = new Morph(PATH_SAMPLES * 3)
  const pathColor = new Morph(PATH_SAMPLES * 3)
  const windowPosition = new Morph(WINDOW_NAMES.length * WINDOW_SAMPLES * 3)

  const write = () => {
    writeLine(path.geometry, pathPosition.current, pathColor.current)
    fans.forEach((fan, slot) => {
      const rim = windowPosition.current.subarray(slot * WINDOW_SAMPLES * 3, (slot + 1) * WINDOW_SAMPLES * 3)
      writeFan(fan, rim)
    })
    for (const rim of rims) {
      writeLine(rim.geometry, windowPosition.current.subarray(rim.slot * WINDOW_SAMPLES * 3, (rim.slot + 1) * WINDOW_SAMPLES * 3))
    }
  }
  const runner = createMorphRunner([pathPosition, pathColor, windowPosition], write)

  const retarget = (duration: number) => {
    if (!model) return
    const current = model
    const positions = new Float32Array(PATH_SAMPLES * 3)
    const colors = new Float32Array(PATH_SAMPLES * 3)
    current.path.forEach((s, i) => {
      positions.set(layoutPoint(s, mode, current.southern), i * 3)
      color.set(KIND_COLORS[s.kind]).multiplyScalar(KIND_INTENSITY[s.kind] * visibilityOnBow(s.alt, mode))
      colors.set([color.r, color.g, color.b], i * 3)
    })
    const windows = new Float32Array(WINDOW_NAMES.length * WINDOW_SAMPLES * 3)
    WINDOW_NAMES.forEach((name, slot) => {
      const win = current.windows.find(w => w.name === name)
      for (let i = 0; i < WINDOW_SAMPLES; i++) {
        // A window this day does not have folds into the pin.
        const point = win ? layoutPoint(win.samples[i]!, mode, current.southern) : OBSERVER
        windows.set(point, (slot * WINDOW_SAMPLES + i) * 3)
      }
    })
    pathPosition.retarget(positions)
    pathColor.retarget(colors)
    windowPosition.retarget(windows)
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
    setSun() {},
    setOpacity(alpha) {
      opacity = alpha
    },
    setResolution(width, height) {
      path.material.resolution.set(width, height)
      for (const rim of rims) rim.material.resolution.set(width, height)
    },
    intro(timeline: gsap.core.Timeline) {
      reveal.path = 0
      reveal.horizon = 0
      const present = WINDOW_NAMES.map((name, slot) => ({ slot, win: model?.windows.find(w => w.name === name) }))
        .filter(entry => entry.win)
        .sort((a, b) => a.win!.start.getTime() - b.win!.start.getTime())
      reveal.fans.forEach((fan, slot) => {
        // A window this day does not have stays ready for a place that has one.
        fan.value = present.some(entry => entry.slot === slot) ? 0 : 1
      })
      timeline.to(reveal, { horizon: 1, duration: 0.8, ease: 'power1.out' }, 0.3)
      timeline.to(reveal, { path: 1, duration: 1.2, ease: 'power1.inOut' }, 0.4)
      present.forEach((entry, order) => {
        timeline.to(reveal.fans[entry.slot]!, { value: 1, duration: 0.8, ease: 'power3.out' }, 1.2 + order * 0.15)
      })
    },
    update(time) {
      path.geometry.instanceCount = Math.round(reveal.path * (PATH_SAMPLES - 1))
      path.material.opacity = opacity
      fans.forEach((fan, slot) => {
        const uniforms = fan.material.uniforms
        uniforms.uReveal!.value = reveal.fans[slot]!.value
        uniforms.uOpacity!.value = opacity
        uniforms.uTime!.value = time
      })
      for (const rim of rims) rim.material.opacity = RIM_OPACITY * opacity * reveal.fans[rim.slot]!.value
      ringMaterial.opacity = 0.2 * opacity * reveal.horizon
      tickMaterial.opacity = 0.18 * opacity * reveal.horizon
      discMaterial.opacity = 0.025 * opacity * reveal.horizon
      const beat = (time % 3) / 3
      pulse.scale.setScalar(1 + 3 * beat)
      pulseMaterial.opacity = 0.6 * (1 - beat) * opacity
      pinMaterial.opacity = opacity
      stemMaterial.opacity = 0.7 * opacity
    },
    dispose() {
      runner.kill()
      disposeTree(group)
      glow.dispose()
    }
  }
}
