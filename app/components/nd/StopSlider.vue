<template>
  <div class="flex flex-col gap-0.5">
    <!-- .row-kv rather than flex justify-between: the caps label and the mono
         value are different faces at different sizes and must share a
         baseline, and the value must never wrap. -->
    <div class="row-kv">
      <span :id="labelId" class="t-label">{{ label }}</span>
      <span
        class="t-num font-semibold"
        :class="isOff ? 'text-ink-faint' : 'text-brand-petrol-800 dark:text-brand-glow'"
      >
        {{ currentLabel }}
      </span>
    </div>

    <div class="relative">
      <input
        ref="inputEl"
        type="range"
        class="stop-slider"
        min="0"
        :max="RESOLUTION"
        step="1"
        :value="sliderPos"
        role="slider"
        :aria-labelledby="labelId"
        :aria-valuemin="0"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        :aria-valuetext="currentLabel"
        @input="onInput"
        @keydown="onKey"
      />

      <!-- The scale: printed numbers along the top, marks along the bottom, the
           track running between them. All of it is decoration for the eye, so
           it is aria-hidden and never takes a pointer event - the input
           underneath owns every interaction. -->
      <div v-if="scale.length" aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 h-2.5">
        <span
          v-for="mark in scale"
          :key="`n${mark.index}`"
          class="slider-scale-num absolute top-0"
          :style="numberStyle(mark)"
        >{{ mark.text }}</span>
      </div>

      <div
        v-if="ticks.length"
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-2"
      >
        <span
          v-for="tick in ticks"
          :key="`t${tick}`"
          class="absolute bottom-0 rounded-full"
          :class="isLabelled(tick)
            ? 'h-2 w-0.5 bg-brand-petrol-800/60 dark:bg-brand-green-800'
            : 'h-1 w-px bg-brand-petrol-800/25 dark:bg-brand-green-800/70'"
          :style="{ left: offsetFor(tick) }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * A native range input over a list of stops, placed by value rather than by
 * index, with a printed scale.
 *
 * Native on purpose. A hand-built slider has to reimplement touch drag, pointer
 * capture and dragging past the end, and gets at least one of them wrong. The
 * skin lives in `main.css` as `.stop-slider`.
 */
import { computed, ref, useId } from 'vue'

const props = defineProps<{
  /** Index into the track. With `offLabel` set, 0 means "not set". */
  modelValue: number
  /** Ascending by `value`, which is what places each item along the track. */
  items: { label: string; value: number }[]
  label: string
  /**
   * Text for an extra "not set" position prepended to the track. The aperture
   * slider uses it, because many aircraft have a fixed iris and would otherwise
   * be handed advice they cannot follow.
   */
  offLabel?: string
  /** Indices to mark, in the same index space as `modelValue`. */
  ticks?: number[]
  /** The subset of `ticks` that also gets a taller mark and a printed number. */
  scale?: { index: number; text: string }[]
}>()

const emit = defineEmits<{ 'update:modelValue': [number] }>()

const labelId = useId()
const inputEl = ref<HTMLInputElement | null>(null)

/**
 * The native input runs over this many steps rather than over the item count.
 *
 * The items are not evenly spaced, so the input cannot carry the index
 * directly. It carries a position along the track instead, at a resolution fine
 * enough that the snap to the nearest item is imperceptible.
 */
const RESOLUTION = 1000

/** The share of the track given to the "not set" stop, when there is one. */
const OFF_SLICE = 0.05

const offset = computed(() => (props.offLabel === undefined ? 0 : 1))
const max = computed(() => props.items.length - 1 + offset.value)
const isOff = computed(() => offset.value === 1 && props.modelValue === 0)
const ticks = computed(() => props.ticks ?? [])
const scale = computed(() => props.scale ?? [])
const labelledSet = computed(() => new Set(scale.value.map(m => m.index)))
const isLabelled = (index: number) => labelledSet.value.has(index)

/**
 * Where each stop sits along the track, from 0 to 1.
 *
 * Placed by the logarithm of the value, not by index. A shutter table is a
 * geometric series, so index and log almost agree - but this one also carries
 * the video speeds 1/120 and 1/240, which sit 0.06 of a stop from their stills
 * neighbours 1/125 and 1/250 while taking a whole index step each. Placing by
 * index gives those two pairs the same room on screen as a full third of a
 * stop, and bends every mark past 1/250 s away from where it belongs.
 *
 * The aperture series has the same problem in miniature: f/11 to f/13 is 0.48
 * of a stop and f/13 to f/14 is 0.21, because both are rounded labels.
 */
const positions = computed<number[]>(() => {
  const values = props.items.map(item => item.value)
  const n = values.length
  if (n === 0) return []

  const lo = Math.log2(values[0]!)
  const span = n === 1 ? 0 : Math.log2(values[n - 1]!) - lo
  const raw = span === 0
    ? values.map((_, i) => (n === 1 ? 0 : i / (n - 1)))
    : values.map(value => (Math.log2(value) - lo) / span)

  if (offset.value === 0) return raw
  return [0, ...raw.map(p => OFF_SLICE + p * (1 - OFF_SLICE))]
})

const positionOf = (index: number): number => positions.value[index] ?? 0
const sliderPos = computed(() => Math.round(positionOf(props.modelValue) * RESOLUTION))

const currentLabel = computed(() => {
  if (isOff.value) return props.offLabel as string
  return props.items[props.modelValue - offset.value]?.label ?? '—'
})

const nearestIndex = (t: number): number => {
  let best = 0
  positions.value.forEach((p, i) => {
    if (Math.abs(p - t) < Math.abs(positionOf(best) - t)) best = i
  })
  return best
}

const onInput = (event: Event) => {
  const el = event.target as HTMLInputElement
  const next = nearestIndex(Number(el.value) / RESOLUTION)

  // Snap the thumb onto the stop it landed on. Vue will not re-render when the
  // index has not changed, so without this the thumb keeps the raw drag
  // position and drifts off its own mark.
  el.value = String(Math.round(positionOf(next) * RESOLUTION))

  if (next !== props.modelValue) emit('update:modelValue', next)
}

/**
 * Arrow keys step one stop, not one thousandth of the track.
 *
 * The input's own step is a position, so its native key handling would move the
 * thumb by an invisible amount and usually land back on the same item. The
 * keyboard has to work in item space instead.
 */
const onKey = (event: KeyboardEvent) => {
  const deltas: Record<string, number> = {
    ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1
  }
  const delta = deltas[event.key]

  if (delta !== undefined) {
    event.preventDefault()
    const next = Math.min(max.value, Math.max(0, props.modelValue + delta))
    if (next !== props.modelValue) emit('update:modelValue', next)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    emit('update:modelValue', 0)
  } else if (event.key === 'End') {
    event.preventDefault()
    emit('update:modelValue', max.value)
  }
}

/**
 * Where a mark sits, in the track's own coordinates.
 *
 * A range input's thumb centre does not travel the full width: it starts half a
 * thumb in and stops half a thumb short, so the thumb never overhangs the ends.
 * A mark placed at a plain percentage drifts away from the thumb towards the
 * middle. The 9px is half the 18px thumb set in `main.css`.
 */
const THUMB = 18

const offsetFor = (index: number): string => {
  const fraction = positionOf(index)
  return `calc(${fraction * 100}% - ${fraction * THUMB - THUMB / 2}px)`
}

/**
 * Every number is centred on its own mark, including the two at the ends.
 *
 * The ends were aligned inward at first, to keep them inside the input's box.
 * That was the wrong box to measure against: the input sits in a panel with
 * 12px of padding either side, and the widest end label - "1/8000" - overhangs
 * by about 7px, so it lands in the padding rather than off the panel. Aligning
 * them inward only made them disagree with the mark they label, which is the
 * one thing a scale must not do.
 */
const numberStyle = (mark: { index: number }) => ({
  left: offsetFor(mark.index),
  transform: 'translateX(-50%)'
})
</script>
