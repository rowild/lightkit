/**
 * The words on the stage: each golden and blue window's times at the tip of
 * its fan, and the compass letters on the horizon ring. HTML drawn by
 * CSS2DRenderer, so they use the app's own type roles (spec 7.5).
 */
import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import type gsap from 'gsap'
import type { Vec3 } from '../globeMath'
import {
  BOW_RADIUS,
  OBSERVER,
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

const formatTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

export const createLabels = (): SkyLayer => {
  const group = new THREE.Group()
  let model: SkyModel | null = null
  let mode: BowMode = 'sky'
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
    const object = new CSS2DObject(element)
    // Golden times hang above their point, blue times below it: a clearance of
    // the label's own height in pixels, at any zoom and on any screen.
    object.center.set(0.5, golden ? 1 : 0)
    group.add(object)
    return { name, golden, element, object, text: '' }
  })

  const compass = (['N', 'E', 'S', 'W'] as const).map((letter, i) => {
    const element = document.createElement('div')
    element.className = 't-label-xs'
    element.textContent = letter
    element.style.textShadow = SHADOW
    const angle = (i * Math.PI) / 2
    const object = new CSS2DObject(element)
    object.position.set(OBSERVER[0] + Math.sin(angle) * R * 1.16, OBSERVER[1], OBSERVER[2] - Math.cos(angle) * R * 1.16)
    group.add(object)
    return element
  })

  /** Outside the rim: golden above and blue below on the sky path, stacked outward on the clock. */
  const anchorFor = (middle: SkySample, golden: boolean, southern: boolean): Vec3 => {
    if (mode === 'sky') {
      const [x, y, z] = layoutPoint(middle, 'sky', southern, R * 1.2)
      return [x, y + (golden ? 0.24 : -0.29), z]
    }
    return layoutPoint(middle, 'clock', southern, R * (golden ? 1.24 : 1.32))
  }

  const anchors = new Morph(LABELLED.length * 3)
  const write = () => {
    windows.forEach((label, i) => label.object.position.fromArray(anchors.current, i * 3))
  }
  const runner = createMorphRunner([anchors], write)
  const showTexts = () => {
    for (const label of windows) label.element.textContent = label.text
  }

  const retarget = (duration: number) => {
    if (!model) return
    const current = model
    const targets = new Float32Array(LABELLED.length * 3)
    windows.forEach((label, i) => {
      const win = current.windows.find(w => w.name === label.name)
      label.object.visible = !!win
      label.text = win ? `${formatTime(win.start)}–${formatTime(win.end)}` : ''
      targets.set(win ? anchorFor(win.samples[MIDDLE]!, label.golden, current.southern) : OBSERVER, i * 3)
    })
    anchors.retarget(targets)
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
    setSun() {},
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
