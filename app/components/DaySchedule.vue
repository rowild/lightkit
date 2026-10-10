<template>
  <div class="glass-panel p-3 sm:p-4 lg:p-6 rounded-2xl shadow-sm flex flex-col gap-2 sm:gap-3">

    <div class="row-kv">
      <h4 class="t-label text-[11px] sm:text-xs">Day Schedule</h4>
      <!-- The date and the sky view's button share the value cell, so row-kv
           still keeps the pair on one line. -->
      <span class="inline-flex items-baseline gap-2">
        <span class="t-label-xs normal-case text-[10px] sm:text-[11px]">{{ formattedDate }}</span>
        <!-- On the panel's right edge, so justify-end (AGENTS.md, .tap). The
             negative margin stops the 44px touch target growing the row. -->
        <button
          type="button"
          aria-label="Open the sky view"
          v-tooltip="'Open the sky view'"
          class="tap grid items-center justify-end -my-4 self-center rounded-full text-ink-faint hover:text-brand-petrol-600 dark:hover:text-brand-glow transition-colors cursor-pointer"
          @click="skyOpen = true"
        >
          <Orbit :size="16" :stroke-width="1.75" />
        </button>
      </span>
    </div>

    <!-- The live-time readout sits INSIDE the track. Above it, it needed 24px of
         reserved headroom that separated this block from its own heading; the
         track is 44px tall for the tap target and the readout fits in it with
         room to spare. -->
    <div class="relative">
      <!-- The Track segments. 44px on touch so the segments clear the minimum
           tap target; the narrow ones stay hard to hit by nature, which is why
           every phase is also listed in the light windows. -->
      <div class="flex h-11 sm:h-10 w-full rounded-xl overflow-hidden border border-brand-petrol-800/15 dark:border-brand-green-800/40 bg-brand-petrol-800/5 dark:bg-brand-green-800/45 p-px">
        <button
          v-for="(segment, idx) in segments"
          :key="idx"
          type="button"
          class="h-full relative group cursor-pointer transition-opacity duration-200 hover:opacity-85"
          :style="{ width: `${getSegmentDurationPercentage(segment)}%` }"
          :class="[
            segment.colorClass,
            activeSegmentStart === segment.start.getTime() ? 'ring-1 ring-inset ring-brand-petrol-700 dark:ring-brand-glow' : '',
            // The inner radius is the outer one less the 1px the track insets
            // its segments by. Written against the token, not as a number: it
            // WAS a number, 10px, correct back when `rounded-xl` meant 12px.
            // main.css later halved the whole radius scale to 6px and this
            // stayed behind, so the segments were rounder than the box holding
            // them - which light mode showed plainly.
            idx === 0 ? 'rounded-l-[calc(var(--radius-xl)-1px)]' : '',
            idx === segments.length - 1 ? 'rounded-r-[calc(var(--radius-xl)-1px)]' : ''
          ]"
          :aria-label="`${segment.name}, ${formatTime(segment.start)} to ${formatTime(segment.end)}`"
          @click="openInfo(segment.name)"
        ></button>
      </div>

      <!-- Needle and readout are separate elements: the needle marks the exact
           minute, while the readout is pulled back inside the panel so it does
           not hang off the edge at either end of the day. Both let taps through
           to the segment buttons underneath. -->
      <div
        v-if="isToday"
        class="absolute inset-y-0 w-0.5 bg-brand-petrol-800 dark:bg-brand-glow z-10 pointer-events-none"
        :style="{ left: `${currentTimePercentage}%` }"
      ></div>
      <!-- The type sits ON the chip, not on a span inside it.

           A block box draws a "strut" from its OWN font and line-height, and
           the line box is as tall as the taller of the strut and the text in
           it. With the readout in a small span inside a box that inherited the
           panel's 16px, the strut won: the line box kept a 16px ascent and a
           16px descent, the 11px digits sat on that shared baseline, and the
           space left above them was 4px against 7px below. Symmetric padding
           could not fix it, because the gap was inside the line box.

           Setting the size and `leading-none` on the chip itself makes the
           strut the same 10px as the digits, so the line box IS the digits and
           the padding is the only spacing left. -->
      <div
        v-if="isToday"
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none inline-flex items-center gap-1 px-1.5 py-1 rounded bg-brand-petrol-800 dark:bg-brand-glow text-white dark:text-brand-petrol-950 whitespace-nowrap t-num-xs text-[10px] leading-none"
        :style="{ left: `${clampedNeedleLabelPercentage}%` }"
      >
        <!-- Only on a phone. A desktop reads the chip against five labelled
             ticks and a needle; the clock is for the glance-sized version. -->
        <Clock class="lg:hidden shrink-0" :size="10" :stroke-width="2.25" />
        <span>{{ currentTimeStr }}</span>
      </div>
    </div>

    <!-- Timeline scale / ticks. A 5 column grid rather than justify-between:
         each label owns a cell, so they cannot crowd each other, and the outer
         two align to the panel edges. -->
    <div class="grid grid-cols-5 gap-1">
      <div
        v-for="(tick, i) in ticks"
        :key="tick.label"
        class="flex flex-col gap-0.5"
        :class="i === 0 ? 'items-start' : i === ticks.length - 1 ? 'items-end' : 'items-center'"
      >
        <span class="t-num-sm text-ink text-[11px] sm:text-[13px]">{{ tick.time }}</span>
        <span class="t-label-xs">{{ tick.label }}</span>
      </div>
    </div>

    <!-- Phase explanations. Teleported to body from inside the component. -->
    <PhaseInfoModal v-model:open="infoOpen" :highlight="infoPhase" />

    <!-- The same day in 3D. Teleported to body; Three.js loads on first open. -->
    <SkyView v-model:open="skyOpen" :lat="lat" :lng="lng" :date="date" />
  </div>
</template>

<script setup lang="ts">
/**
 * The day as one track, from the start of dawn to the end of dusk.
 *
 * Split out of `SunTimeline.vue` on 2026-08-17. On a phone the map has to sit
 * between this block and the state cards, which one component cannot do.
 */
import { ref, computed, watch } from 'vue'
import { Clock, Orbit } from '@lucide/vue'
import { useSun, type SolarTimes, type SolarSegment } from '../composables/useSun'
import { useNow } from '../composables/useNow'
import PhaseInfoModal from './PhaseInfoModal.vue'
import SkyView from './sky/SkyView.vue'

const props = defineProps<{
  lat: number
  lng: number
  date: Date
}>()

const sunCalc = useSun()
const now = useNow()

const times = computed<SolarTimes>(() => sunCalc.getSolarTimes(props.date, props.lat, props.lng))
const segments = computed<SolarSegment[]>(() => sunCalc.getSolarSegments(props.date, props.lat, props.lng))

// Phase explanations live in a modal rather than inline, so a long description
// cannot push the times a pilot is reading off the screen.
const infoOpen = ref(false)
const infoPhase = ref<string | null>(null)
// The sky view overlay. Its own component; this block only owns the button.
const skyOpen = ref(false)

const openInfo = (phaseName: string | null) => {
  infoPhase.value = phaseName
  infoOpen.value = true
}

// Close the explanation if the date changes underneath it.
watch(() => props.date, () => {
  infoOpen.value = false
})

const isToday = computed(() => {
  const d1 = props.date
  const d2 = now.value
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
})

// Ring on the track marks where we are now. Matched on start time, not name:
// "Night" occurs twice in a day, and matching by name ringed both ends of the
// track at once.
const currentSegment = computed<SolarSegment | null>(() => {
  const referenceTime = isToday.value ? now.value : props.date
  return sunCalc.getCurrentSegment(referenceTime, segments.value)
})

const activeSegmentStart = computed(() => currentSegment.value?.start.getTime() ?? null)

const formattedDate = computed(() =>
  props.date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
)

const currentTimeStr = computed(() =>
  now.value.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
)

const ticks = computed(() => [
  { label: 'Dawn', time: formatTime(times.value.dawn) },
  { label: 'Sunrise', time: formatTime(times.value.sunrise) },
  { label: 'Noon', time: formatTime(times.value.solarNoon) },
  { label: 'Sunset', time: formatTime(times.value.sunset) },
  { label: 'Dusk', time: formatTime(times.value.dusk) }
])

const currentTimePercentage = computed(() => {
  if (segments.value.length === 0) return 0

  const startDay = segments.value[0]!.start.getTime()
  const lastSeg = segments.value[segments.value.length - 1]
  if (!lastSeg) return 0
  const endDay = lastSeg.end.getTime()
  const totalDuration = endDay - startDay
  if (totalDuration <= 0) return 0

  const currentMs = now.value.getTime()
  if (currentMs < startDay) return 0
  if (currentMs > endDay) return 100

  return ((currentMs - startDay) / totalDuration) * 100
})

// The needle can sit at 0% or 100%, where a centred readout would hang outside
// the panel. The line stays exact; only its readout is pulled back inside.
const clampedNeedleLabelPercentage = computed(() =>
  Math.min(88, Math.max(12, currentTimePercentage.value))
)

const getSegmentDurationPercentage = (segment: SolarSegment) => {
  if (segments.value.length === 0) return 0

  const startDay = segments.value[0]!.start.getTime()
  const lastSeg = segments.value[segments.value.length - 1]
  if (!lastSeg) return 0
  const endDay = lastSeg.end.getTime()
  const totalDuration = endDay - startDay
  if (totalDuration <= 0) return 0

  const segmentDuration = segment.end.getTime() - segment.start.getTime()
  return (segmentDuration / totalDuration) * 100
}

const formatTime = (d: Date | undefined) => {
  if (!d || isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>
