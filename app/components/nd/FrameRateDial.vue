<template>
  <!-- Width-driven, not height-driven.
       On a phone the dial is limited by width, so deriving the height from the
       width makes the element exactly the size of the drawing and there is
       nothing left to letterbox. Driving it from the height instead left the
       element 356px tall around a 297px drawing, and those 30 dead pixels sat
       between the sliders and the first label. max-h-full still catches the
       case where height is the tighter of the two; the slack then falls on the
       horizontal axis, where there is room to spare. -->
  <div
    ref="rootEl"
    class="dial-shell relative aspect-212/180 w-full max-h-full min-h-0 select-none"
    :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
    role="slider"
    :aria-label="ariaLabel ?? 'Frame rate'"
    :aria-valuemin="0"
    :aria-valuemax="items.length - 1"
    :aria-valuenow="modelValue"
    :aria-valuetext="items[modelValue]?.label"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel.prevent="onWheel"
    @keydown="onKey"
  >
    <!-- Trimmed to the ink, not left square.
         The track stops 45 degrees short of the bottom on each side, so the
         drawing is a good deal wider than it is tall - 205 by 159 units of
         actual content. A square viewBox padded that out to 240 by 240, and the
         whole difference showed up as empty space between the sliders above and
         the first label of the dial.

         It stays centred on (100,100) because the HTML overlay in the middle is
         centred on the element: move the viewBox off-centre and the filter name
         drifts out of its ring. The element carries the same 212:176 ratio, so
         preserveAspectRatio has nothing left to letterbox. -->
    <svg viewBox="-6 10 212 180" class="w-full h-full">
      <!-- The track. One arc: large-arc-flag 1 because 270 degrees is more than
           a half turn, sweep-flag 1 because it runs clockwise. -->
      <path
        :d="trackPath"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
        class="text-brand-petrol-800/20 dark:text-brand-green-800/50"
      />

      <!-- Ticks are all alike. The handle is what says where you are, so
           highlighting a tick as well would be the same fact drawn twice. -->
      <line
        v-for="(item, i) in items"
        :key="`tick-${item.label}`"
        :x1="pointAt(angleFor(i), 65).x"
        :y1="pointAt(angleFor(i), 65).y"
        :x2="pointAt(angleFor(i), 77).x"
        :y2="pointAt(angleFor(i), 77).y"
        stroke-width="1.5"
        stroke="currentColor"
        stroke-linecap="round"
        class="text-brand-petrol-800/30 dark:text-brand-green-800/70"
      />

      <!-- Labels are dropped below 160px, where they would be under 8px tall.
           Nothing is lost: the readout line under the dial always names the
           current value. -->
      <template v-if="showLabels">
        <text
          v-for="(item, i) in items"
          :key="`label-${item.label}`"
          :x="pointAt(angleFor(i), 90).x"
          :y="pointAt(angleFor(i), 90).y"
          :text-anchor="anchorFor(angleFor(i))"
          dominant-baseline="middle"
          fill="currentColor"
          :font-size="labelFontSize"
          class="dial-tick-label"
          :class="i === modelValue
            ? 'text-brand-petrol-900 dark:text-brand-glow font-semibold'
            : 'text-ink-faint'"
        >{{ labelFor(i) }}</text>
      </template>

      <!-- r=62, not the 52 this started at. The ring's inner width is what the
           filter name has to fit inside, and "ND1000" is 1.44x "ND32" because
           Josefin's zero is wide and its one is narrow. -->
      <circle
        cx="100"
        cy="100"
        r="62"
        fill="none"
        stroke="currentColor"
        stroke-width="4"
        class="text-brand-petrol-700 dark:text-brand-glow transition-opacity duration-200"
        :class="dimmed ? 'opacity-25' : 'dial-ring-glow'"
      />

      <!-- The handle and its arrow, drawn once at 12 o'clock and rotated into
           place. Rotating is why every number here is a plain vertical offset:
           at angle 0 the handle sits above the centre, so y = 100 - radius. -->
      <g
        :transform="`rotate(${angleFor(modelValue)} 100 100)`"
        :class="dragging ? '' : 'transition-transform duration-150 ease-out'"
      >
        <!-- The arrow, in the band between the grip and the labels: base at
             radius 78, tip at 86, with the labels at 90. It has to start
             outside the grip, which is drawn after it and would otherwise
             swallow it whole - which is exactly what happened at radius 76. -->
        <polygon
          points="100,14 95.4,22 104.6,22"
          fill="currentColor"
          class="text-brand-petrol-800 dark:text-brand-glow"
        />

        <!-- The grip, sitting on the track at radius 71. -->
        <circle
          cx="100"
          cy="29"
          :r="dragging ? 7.5 : 6"
          fill="currentColor"
          stroke-width="2"
          class="text-brand-petrol-800 dark:text-brand-glow stroke-white dark:stroke-brand-petrol-950 transition-all duration-150"
        />

        <!-- A finger is wider than the grip. This gives it 32 units of target
             without making the drawn handle clumsy. -->
        <circle cx="100" cy="29" r="16" fill="transparent" />
      </g>
    </svg>

    <!-- The centre, as HTML rather than SVG text, so the type roles and the
         theme colours in main.css apply without being restated. 48% sits just
         inside the answer ring, whose inner width is 120 of the 240 viewBox
         units, or 50%. -->
    <div class="absolute inset-0 grid place-items-center pointer-events-none">
      <div class="flex flex-col items-center gap-1 text-center w-[48%]">
        <span class="dial-title">{{ centreTitle }}</span>
        <!-- whitespace-pre-line, so the caller decides where the line breaks
             rather than leaving it to whatever width the ring happens to be. -->
        <span
          v-if="showCaption"
          class="t-label-xs dial-caption whitespace-pre-line text-brand-petrol-800 dark:text-brand-glow"
        >{{ centreCaption }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * A rotary selector over a short list, with a glowing ring in the middle that
 * shows something else entirely.
 *
 * The component knows nothing about ND filters or frame rates. It takes a list
 * and an index, and it emits an index. The centre is two strings the caller
 * supplies.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  modelValue: number
  /** Ascending by `value`. `value` places the item on the track; see below. */
  items: { label: string; value: number }[]
  centreTitle: string
  centreCaption: string
  /**
   * Unit appended to the first and last label, so the scale says what it
   * measures. Only those two: on all seven it is a wall of repeated text.
   */
  unit?: string
  /** Grey the ring out, for when the target is not coming from this dial. */
  dimmed?: boolean
  ariaLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [number] }>()

/**
 * Angles are degrees from 12 o'clock, positive clockwise. The track runs from
 * -135 to +135, leaving the bottom 90 degrees open so the two ends of the scale
 * never touch and the lowest and highest value cannot be confused.
 */
const START = -135
const SWEEP = 270

/**
 * The smallest gap two neighbours may have, as a fraction of the track. 0.085
 * is 23 degrees, which is about 29px of arc on a 179px dial.
 */
const MIN_GAP = 0.085

/**
 * Where each item sits on the track, from 0 at the start to 1 at the end.
 *
 * Spaced by the logarithm of the value, not by index. Frame rates are ratios:
 * 240 is one octave above 120 and two above 60, while 24 and 25 are 0.06 of an
 * octave apart. Even spacing draws all six gaps the same and hides that
 * completely.
 *
 * Pure log spacing has its own problem: it puts 24 and 25 within five degrees
 * of each other, which is seven pixels on a phone, with two labels on top of
 * one another. So the log positions get a minimum separation pushed through
 * them. The shape stays logarithmic where it carries meaning - 60 to 120 to 240
 * are still the three widest gaps by far - and the crowded end stays reachable.
 *
 * The forward pass cannot overflow: `gap` is capped at 1/(n-1), so item i can
 * never be pushed beyond i/(n-1), and the last item is already at 1.
 */
const positions = computed<number[]>(() => {
  const values = props.items.map(item => item.value)
  const n = values.length
  if (n === 0) return []
  if (n === 1) return [0]

  const lo = Math.log2(values[0]!)
  const span = Math.log2(values[n - 1]!) - lo
  const raw = span === 0
    ? values.map((_, i) => i / (n - 1))
    : values.map(value => (Math.log2(value) - lo) / span)

  const gap = Math.min(MIN_GAP, 1 / (n - 1))
  const spaced = [raw[0]!]
  for (let i = 1; i < n; i++) spaced.push(Math.max(raw[i]!, spaced[i - 1]! + gap))
  return spaced
})

/** Where index `i` sits on the track, in degrees. */
const angleFor = (i: number): number => START + (positions.value[i] ?? 0) * SWEEP

/** An angle and a radius, as a point in the viewBox. */
const pointAt = (angle: number, r: number): { x: number; y: number } => {
  const rad = (angle * Math.PI) / 180
  return { x: 100 + r * Math.sin(rad), y: 100 - r * Math.cos(rad) }
}

/**
 * The label to draw, with the unit on the two ends.
 *
 * The unit is dropped on a small dial. The labels hold one apparent size rather
 * than shrinking with the drawing (see `labelFontSize`), so they take a larger
 * share of the viewBox the smaller the dial gets - and "240 fps" is the string
 * that decides how wide the viewBox has to be. Dropping the unit below 260px
 * keeps the trimmed viewBox valid without padding it back out for every size.
 */
const labelFor = (i: number): string => {
  const label = props.items[i]?.label ?? ''
  if (!props.unit || !showUnits.value) return label
  const isEnd = i === 0 || i === props.items.length - 1
  return isEnd ? `${label} ${props.unit}` : label
}

/** Labels read outward, so the side of the dial decides the anchor. */
const anchorFor = (angle: number): 'start' | 'middle' | 'end' => {
  const s = Math.sin((angle * Math.PI) / 180)
  if (s > 0.25) return 'start'
  if (s < -0.25) return 'end'
  return 'middle'
}

// Radius 71 puts the track through the middle of the 65-to-77 tick band, so it
// reads as a spine the ticks sit on rather than a second ring beside them. The
// handle rides the same radius.
const trackPath = computed(() => {
  const a = pointAt(START, 71)
  const b = pointAt(START + SWEEP, 71)
  return `M ${a.x} ${a.y} A 71 71 0 1 1 ${b.x} ${b.y}`
})

const rootEl = ref<HTMLElement | null>(null)
const dragging = ref(false)

// --- input -----------------------------------------------------------------

const metrics = () => {
  const box = rootEl.value!.getBoundingClientRect()
  return {
    cx: box.left + box.width / 2,
    cy: box.top + box.height / 2,
    radius: Math.min(box.width, box.height) / 2
  }
}

const applyFromEvent = (event: PointerEvent) => {
  const { cx, cy } = metrics()
  // atan2(x, -y) rather than the usual atan2(y, x): this measures from 12
  // o'clock and increases clockwise, which is how the track is laid out.
  const angle = (Math.atan2(event.clientX - cx, cy - event.clientY) * 180) / Math.PI
  const clamped = Math.min(START + SWEEP, Math.max(START, angle))
  const t = (clamped - START) / SWEEP

  // Nearest position, not a rounded fraction: the items are not evenly spaced,
  // so there is no arithmetic shortcut from an angle to an index.
  let nearest = 0
  positions.value.forEach((p, i) => {
    if (Math.abs(p - t) < Math.abs(positions.value[nearest]! - t)) nearest = i
  })

  if (nearest !== props.modelValue) emit('update:modelValue', nearest)
}

const onPointerDown = (event: PointerEvent) => {
  if (!rootEl.value) return
  const { cx, cy, radius } = metrics()
  const fraction = Math.hypot(event.clientX - cx, event.clientY - cy) / radius

  // Only the outer band grabs. 0.54 is 64.8 of the 120-unit radius: outside the
  // answer ring, whose stroke ends at 64, and inside the grip, whose inner edge
  // is 65. So a tap on the answer never spins the dial and a tap on the grip
  // always does. The upper bound keeps a corner tap off the control entirely.
  if (fraction < 0.54 || fraction > 1.05) return

  dragging.value = true
  rootEl.value.setPointerCapture(event.pointerId)
  applyFromEvent(event)
}

const onPointerMove = (event: PointerEvent) => {
  if (dragging.value) applyFromEvent(event)
}

const onPointerUp = (event: PointerEvent) => {
  if (!dragging.value) return
  dragging.value = false
  rootEl.value?.releasePointerCapture(event.pointerId)
}

const step = (delta: number) => {
  const next = Math.min(props.items.length - 1, Math.max(0, props.modelValue + delta))
  if (next !== props.modelValue) emit('update:modelValue', next)
}

const onWheel = (event: WheelEvent) => step(event.deltaY > 0 ? 1 : -1)

const onKey = (event: KeyboardEvent) => {
  const actions: Record<string, () => void> = {
    ArrowRight: () => step(1),
    ArrowUp: () => step(1),
    ArrowLeft: () => step(-1),
    ArrowDown: () => step(-1),
    Home: () => emit('update:modelValue', 0),
    End: () => emit('update:modelValue', props.items.length - 1)
  }
  const action = actions[event.key]
  if (!action) return
  event.preventDefault()
  action()
}

// --- size ------------------------------------------------------------------

const width = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!rootEl.value) return
  observer = new ResizeObserver((entries) => {
    width.value = entries[0]?.contentRect.width ?? 0
  })
  observer.observe(rootEl.value)
})

onUnmounted(() => observer?.disconnect())

const showLabels = computed(() => width.value >= 160)

/** The width of the viewBox, which is what the element's width is stretched to. */
const VIEWBOX_WIDTH = 212

/**
 * The tick label size, in viewBox units.
 *
 * A `font-size` written in px inside an SVG is not a screen pixel. It is a
 * viewBox unit, and the viewBox transform then scales it along with the rest of
 * the drawing - so the stylesheet's "9px" was drawn at 17px on a 412px dial and
 * at 25px on a desktop one. Container units made that worse rather than better:
 * a `cqw` is itself a share of the width, so the drawn size grew with the
 * *square* of the dial. That is why this moved out of main.css.
 *
 * Here the measured width is already known, so the conversion can run the other
 * way. `screen` is the size meant to be read - 7.5px on the smallest dial that
 * still prints labels, rising to 10.5px, just under the 11px of `.t-label-xs`
 * elsewhere in the app. Multiplying by the units-per-pixel scale turns that into
 * the viewBox units the SVG wants, and the labels then hold one apparent size
 * across every breakpoint instead of tracking the drawing.
 */
const labelFontSize = computed(() => {
  const w = width.value
  if (w <= 0) return 6
  const screen = Math.min(10.5, Math.max(7.5, 7.5 + (w - 160) * 0.01))
  return (screen * VIEWBOX_WIDTH) / w
})

/**
 * The caption needs a little more room than the ring labels do.
 *
 * The threshold was 260px while the caption was one line and fixed at 11px.
 * Broken across two lines and given a fluid size by `.dial-caption`, the
 * binding word is "RECOMMENDED" - 99px at 11px, because caps are wider than
 * the lowercase this was first measured in. It scales down to an 8px floor,
 * and 150px is the dial size at which even that floor stops fitting inside the
 * ring. Below it the name stands alone, which the readout line under the dial
 * already explains.
 */
const showCaption = computed(() => width.value >= 150)

/** See labelFor: the unit is what pushes the widest label past the viewBox. */
const showUnits = computed(() => width.value >= 260)
</script>
