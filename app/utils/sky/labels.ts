/**
 * The words on the stage: each golden and blue window's times at the tip of
 * its fan, and the compass letters on the horizon ring. HTML drawn by
 * CSS2DRenderer, so they use the app's own type roles (spec 7.5).
 *
 * A time label is anchored in 3D at its fan's tip, the window's middle on the
 * bow, and set off from it in screen pixels: a fixed gap straight out from the
 * pin, so it sits at the tip on any screen and at any zoom. When that place is
 * taken (by the pin, the sun, the bow, a fan, the horizon ring, a compass
 * letter, another label or the screen's edge) it turns round the tip, or steps
 * out a little, until it is clear.
 */
import * as THREE from 'three'
import { CSS2DObject, type CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import type gsap from 'gsap'
import {
  BOW_RADIUS,
  OBSERVER,
  PLANET_RADIUS,
  WINDOW_SAMPLES,
  layoutPoint,
  type BowMode,
  type SkyModel,
  type SkySample,
  type WindowName
} from '../skyGeometry'
import { Morph, createMorphRunner } from './morph'
import { PALETTE } from './palette'
import type { SkyLayer } from './types'

const R = BOW_RADIUS
const LABELLED: WindowName[] = ['Morning Blue Hour', 'Morning Golden Hour', 'Evening Golden Hour', 'Evening Blue Hour']
const MIDDLE = Math.floor(WINDOW_SAMPLES / 2)
/** Legible over a bright planet as well as over space. */
const SHADOW = '0 0 6px rgba(0,0,0,0.95), 0 0 14px rgba(0,0,0,0.8)'
/** The compass letters stand just outside the horizon ring. */
const COMPASS_RADIUS = R * 1.16

/** Pixels from a fan's tip to the nearest edge of its time label. */
const TIP_GAP_PX = 14
/** When the first place is taken, a label may step this much further out, this many times. */
const STEP_PX = 8
const STEPS = 5
/** Turns away from straight out, tried in order. Turning back over the fan is the last resort. */
const OUTWARD_TURNS_DEG = [0, 30, 60, 90]
const INWARD_TURNS_DEG = [120, 150, 180]
/** Turning outward, a label may go either way up to this angle; beyond it, golden only turns up and blue only down. */
const SLIGHT_TURN_DEG = 30
/** Room kept clear round the pin, the compass letters, the lines, and between two labels. */
const PIN_CLEAR_PX = 16
const COMPASS_CLEAR_PX = 10
const LINE_CLEAR_PX = 1
const LABEL_CLEAR_PX = 4
/** Labels stay on screen, and below the search bar. */
const EDGE_PX = 8
const TOP_BAR_PX = 60
/** The sun's bright core, in world units, stays clear of every label. */
const SUN_CLEAR = 0.16
/** The planet's disc, a touch beyond its surface for the atmosphere, stays clear too. */
const PLANET_CLEAR = 1.04
/** The lines a label must not cross: every third sample of the bow, and the horizon ring. */
const PATH_STRIDE = 3
const RING_POINTS = 64
/** Points kept clear inside each fan: every twelfth rim sample, at these shares of the way out from the pin. */
const FAN_STRIDE = 12
const FAN_DEPTHS = [0.4, 0.6, 0.8, 0.92]
/** Below this altitude the sky path has faded out, so a label may cover it. */
const PATH_FADED_ALT = -10
/**
 * When no place is free, the least bad one wins. Leaving the screen is worst,
 * then covering a label or the pin, the sun or the planet, a compass letter, and
 * last a line: each point of the bow or a fan, and a tenth of that for each
 * point of the faint horizon ring.
 */
const COST = { offscreen: 100, label: 50, pin: 50, sun: 30, planet: 30, compass: 20, line: 1, ring: 0.1 } as const

const formatTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

const ringPoints = Array.from({ length: RING_POINTS }, (_, i) => {
  const a = (i / RING_POINTS) * Math.PI * 2
  return [OBSERVER[0] + R * Math.cos(a), OBSERVER[1], OBSERVER[2] + R * Math.sin(a)]
}).flat()

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export const createLabels = (): SkyLayer => {
  const group = new THREE.Group()
  let model: SkyModel | null = null
  let mode: BowMode = 'sky'
  let sun: SkySample | null = null
  let opacity = 1
  let settled = true
  const reveal = { labels: 1 }

  const windows = LABELLED.map((name) => {
    const golden = name.includes('Golden')
    const element = document.createElement('div')
    element.className = 't-num-xs whitespace-nowrap'
    element.style.color = golden ? PALETTE.golden : PALETTE.blue
    element.style.textShadow = SHADOW
    element.style.transition = 'opacity 0.3s ease'
    // CSS2DRenderer owns the outer element's transform; the pixel offset goes on the text.
    const text = document.createElement('div')
    element.append(text)
    const object = new CSS2DObject(element)
    group.add(object)
    return { name, golden, element, text, object, label: '', width: 0, height: 0, offset: '' }
  })
  // Golden times are placed first: they lead.
  const placingOrder = [...windows].sort((a, b) => Number(b.golden) - Number(a.golden))

  const compassWorld = [0, 1, 2, 3].map((i) => {
    const angle = (i * Math.PI) / 2
    return new THREE.Vector3(
      OBSERVER[0] + Math.sin(angle) * COMPASS_RADIUS,
      OBSERVER[1],
      OBSERVER[2] - Math.cos(angle) * COMPASS_RADIUS
    )
  })
  const compass = (['N', 'E', 'S', 'W'] as const).map((letter, i) => {
    const element = document.createElement('div')
    element.className = 't-label-xs'
    element.textContent = letter
    element.style.textShadow = SHADOW
    const object = new CSS2DObject(element)
    object.position.copy(compassWorld[i]!)
    group.add(object)
    return element
  })

  /** The fan's tip: the window's middle, on the bow. */
  const anchorFor = (middle: SkySample, southern: boolean) => layoutPoint(middle, mode, southern)

  const anchors = new Morph(LABELLED.length * 3)
  const write = () => {
    windows.forEach((label, i) => label.object.position.fromArray(anchors.current, i * 3))
  }
  const runner = createMorphRunner([anchors], write)
  const showTexts = () => {
    for (const label of windows) {
      label.text.textContent = label.label
      label.width = 0 // measured again once shown
    }
  }

  // --- Placement in screen space ---------------------------------------------

  /** The lines to keep clear, in world space; projected every frame. The ring's points come last. */
  let lineWorld = new Float32Array(ringPoints)
  let lineScreen = new Float32Array(0)
  let ringStart = 0
  const sunWorld = new THREE.Vector3()
  let hasSun = false

  const updateLines = () => {
    if (!model) return
    const current = model
    const points: number[] = []
    current.path.forEach((s, i) => {
      if (i % PATH_STRIDE !== 0) return
      if (mode === 'sky' && s.alt < PATH_FADED_ALT) return
      points.push(...layoutPoint(s, mode, current.southern))
    })
    // A few points inside each golden and blue fan, so a time is not set on the light itself.
    for (const win of current.windows) {
      if (!LABELLED.includes(win.name)) continue
      for (let i = 0; i < WINDOW_SAMPLES; i += FAN_STRIDE) {
        const rim = layoutPoint(win.samples[i]!, mode, current.southern)
        for (const f of FAN_DEPTHS) points.push(...rim.map((c, k) => OBSERVER[k]! + (c - OBSERVER[k]!) * f))
      }
    }
    lineWorld = new Float32Array([...points, ...ringPoints])
    lineScreen = new Float32Array((lineWorld.length / 3) * 2)
    ringStart = points.length / 3
  }
  const updateSun = () => {
    hasSun = !!(model && sun)
    if (model && sun) sunWorld.fromArray(layoutPoint(sun, mode, model.southern))
  }

  const v = new THREE.Vector3()
  const up = new THREE.Vector3()
  const planetCenter = new THREE.Vector3()
  const placed: Box[] = []

  const place = (renderer: CSS2DRenderer, camera: THREE.Camera) => {
    const { width, height } = renderer.getSize()
    let px = 0
    let py = 0
    const project = (p: THREE.Vector3) => {
      v.copy(p).project(camera)
      px = ((v.x + 1) / 2) * width
      py = ((1 - v.y) / 2) * height
    }

    for (let i = 0; i < lineWorld.length / 3; i++) {
      project(v.fromArray(lineWorld, i * 3))
      lineScreen[i * 2] = px
      lineScreen[i * 2 + 1] = py
    }
    const circles: { x: number; y: number; r: number; cost: number }[] = []
    project(v.fromArray(OBSERVER))
    const pin = { x: px, y: py }
    circles.push({ ...pin, r: PIN_CLEAR_PX, cost: COST.pin })
    /** A ball in the scene, as a disc on screen: its radius measured along the camera's up. */
    const disc = (center: THREE.Vector3, radius: number, cost: number) => {
      project(up.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(radius).add(center))
      const edgeX = px
      const edgeY = py
      project(center)
      circles.push({ x: px, y: py, r: Math.hypot(edgeX - px, edgeY - py), cost })
    }
    disc(planetCenter, PLANET_RADIUS * PLANET_CLEAR, COST.planet)
    if (hasSun) disc(sunWorld, SUN_CLEAR, COST.sun)
    for (const point of compassWorld) {
      project(point)
      circles.push({ x: px, y: py, r: COMPASS_CLEAR_PX, cost: COST.compass })
    }

    /** 0 when the box is free; otherwise how badly it is placed. */
    const penalty = (b: Box) => {
      let cost = 0
      if (b.x0 < EDGE_PX || b.x1 > width - EDGE_PX || b.y0 < TOP_BAR_PX || b.y1 > height - EDGE_PX) cost += COST.offscreen
      for (const o of placed) {
        if (b.x0 < o.x1 + LABEL_CLEAR_PX && o.x0 < b.x1 + LABEL_CLEAR_PX && b.y0 < o.y1 + LABEL_CLEAR_PX && o.y0 < b.y1 + LABEL_CLEAR_PX) cost += COST.label
      }
      for (const c of circles) {
        const dx = c.x - Math.max(b.x0, Math.min(c.x, b.x1))
        const dy = c.y - Math.max(b.y0, Math.min(c.y, b.y1))
        if (dx * dx + dy * dy < c.r * c.r) cost += c.cost
      }
      for (let i = 0; i < lineScreen.length; i += 2) {
        const x = lineScreen[i]!
        const y = lineScreen[i + 1]!
        if (x > b.x0 - LINE_CLEAR_PX && x < b.x1 + LINE_CLEAR_PX && y > b.y0 - LINE_CLEAR_PX && y < b.y1 + LINE_CLEAR_PX) {
          cost += i / 2 >= ringStart ? COST.ring : COST.line
        }
      }
      return cost
    }

    placed.length = 0
    for (const label of placingOrder) {
      if (!label.object.visible) continue
      if (!label.width) {
        label.width = label.text.offsetWidth
        label.height = label.text.offsetHeight
        if (!label.width) continue // not laid out yet; next frame
      }
      const hw = label.width / 2
      const hh = label.height / 2
      project(label.object.position)
      const tip = { x: px, y: py }
      let dx = tip.x - pin.x
      let dy = tip.y - pin.y
      const length = Math.hypot(dx, dy)
      if (length < 1) {
        dx = 0
        dy = -1
      } else {
        dx /= length
        dy /= length
      }

      let best: { cost: number; box: Box } | null = null
      search: for (const turns of [OUTWARD_TURNS_DEG, INWARD_TURNS_DEG]) {
        const outward = turns === OUTWARD_TURNS_DEG
        for (let step = 0; step <= STEPS; step++) {
          for (const turn of turns) {
            // Golden turns upward first, blue downward. A wide outward turn the
            // other way would set a golden time beside a blue fan.
            const options = (turn === 0 ? [0] : [turn, -turn]).map((deg) => {
              const a = (deg * Math.PI) / 180
              return { ux: dx * Math.cos(a) - dy * Math.sin(a), uy: dx * Math.sin(a) + dy * Math.cos(a) }
            })
            options.sort((a, b) => (label.golden ? a.uy - b.uy : b.uy - a.uy))
            if (outward && turn > SLIGHT_TURN_DEG) options.length = 1
            for (const { ux, uy } of options) {
              // Out from the tip until the box's nearest edge is the gap away.
              const reach = TIP_GAP_PX + hw * Math.abs(ux) + hh * Math.abs(uy) + step * STEP_PX
              const cx = tip.x + ux * reach
              const cy = tip.y + uy * reach
              const box = { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh }
              const cost = penalty(box)
              if (!best || cost < best.cost) best = { cost, box }
              if (cost === 0) break search
            }
          }
        }
      }
      if (!best) continue
      placed.push(best.box)
      const offset = `translate(${Math.round(best.box.x0 + hw - tip.x)}px, ${Math.round(best.box.y0 + hh - tip.y)}px)`
      if (offset !== label.offset) {
        label.text.style.transform = offset
        label.offset = offset
      }
    }
  }

  // Placed after every label has been positioned this frame, so all of them
  // are laid out (and measurable) when it runs. The pin is always in view.
  const placer = new CSS2DObject(document.createElement('div'))
  placer.position.fromArray(OBSERVER)
  placer.onBeforeRender = (renderer, _scene, camera) => place(renderer as CSS2DRenderer, camera)
  group.add(placer)

  const retarget = (duration: number) => {
    if (!model) return
    const current = model
    const targets = new Float32Array(LABELLED.length * 3)
    windows.forEach((label, i) => {
      const win = current.windows.find(w => w.name === label.name)
      label.object.visible = !!win
      label.label = win ? `${formatTime(win.start)}–${formatTime(win.end)}` : ''
      targets.set(win ? anchorFor(win.samples[MIDDLE]!, current.southern) : OBSERVER, i * 3)
    })
    anchors.retarget(targets)
    updateLines()
    updateSun()
    if (duration > 0) {
      // Fade out while gliding; the new times appear when the labels land.
      settled = false
      runner.run(duration, () => {
        showTexts()
        settled = true
      })
    } else {
      runner.run(0)
      showTexts()
      settled = true
    }
  }

  let lastWindowOpacity = -1
  let lastCompassOpacity = -1

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
      sun = next
      updateSun()
    },
    setOpacity(alpha) {
      opacity = alpha
    },
    setResolution() {},
    intro(timeline: gsap.core.Timeline) {
      reveal.labels = 0
      timeline.to(reveal, { labels: 1, duration: 0.4, ease: 'power1.out' }, 2.1)
    },
    update() {
      const windowOpacity = settled ? opacity * reveal.labels : 0
      if (windowOpacity !== lastWindowOpacity) {
        for (const label of windows) label.element.style.opacity = String(windowOpacity)
        lastWindowOpacity = windowOpacity
      }
      const compassOpacity = opacity * reveal.labels * 0.7
      if (compassOpacity !== lastCompassOpacity) {
        for (const element of compass) element.style.opacity = String(compassOpacity)
        lastCompassOpacity = compassOpacity
      }
    },
    dispose() {
      runner.kill()
      group.clear()
    }
  }
}
