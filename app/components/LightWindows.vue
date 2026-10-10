<template>
  <!-- Two groups of times, plus the polar notice when neither group exists.
       Rendered twice from LightState: inline on a desktop, and inside a dialog
       on a phone, where the four blocks a pilot came for must fit one screen. -->
  <div class="flex flex-col gap-5">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      <section v-for="group in windowGroups" :key="group.title" class="flex flex-col gap-2.5">
        <h4 class="t-label">{{ group.title }}</h4>
        <div class="flex flex-col gap-2">
          <!-- row-kv keeps the phase name shrinkable and the time range
               unbreakable, so no row can ever wrap. -->
          <div v-for="win in group.windows" :key="win.phase" class="row-kv">
            <span class="font-display text-sm font-semibold" :class="win.colorClass">{{ win.label }}</span>
            <span class="t-num-sm text-ink">{{ getPhaseTimes(win.phase) }}</span>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="!hasAnyMagicHour"
      class="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/12 border border-amber-500/30 t-body-sm text-ink"
    >
      {{ polarStateExplanation }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The morning and evening light windows for one date.
 *
 * Its own component because it has two homes. On a desktop it sits under the
 * state cards as before; on a phone it is behind the "Light windows" link, so
 * the day schedule, the map and the two state cards can share one screen.
 */
import { computed } from 'vue'
import { useSun, type SolarSegment } from '../composables/useSun'

const props = defineProps<{
  lat: number
  lng: number
  date: Date
}>()

const sunCalc = useSun()

const segments = computed<SolarSegment[]>(() =>
  sunCalc.getSolarSegments(props.date, props.lat, props.lng)
)

const windowGroups = [
  {
    title: 'Morning windows',
    windows: [
      { phase: 'Morning Blue Hour', label: 'Blue hour', colorClass: 'text-brand-glow-cyan' },
      { phase: 'Morning Golden Hour', label: 'Golden hour', colorClass: 'text-brand-glow-amber' }
    ]
  },
  {
    title: 'Evening windows',
    windows: [
      { phase: 'Evening Golden Hour', label: 'Golden hour', colorClass: 'text-brand-glow-amber' },
      { phase: 'Evening Blue Hour', label: 'Blue hour', colorClass: 'text-brand-glow-cyan' }
    ]
  }
]

const formatTime = (d: Date | undefined) => {
  if (!d || isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

const getPhaseTimes = (phaseName: string) => {
  const seg = segments.value.find(s => s.name === phaseName)
  if (!seg) return 'Does not occur'
  return `${formatTime(seg.start)} - ${formatTime(seg.end)}`
}

// Shared with the sky view, so both explain an empty day the same way.
const polarStateExplanation = computed(() =>
  sunCalc.getPolarExplanation(props.date, props.lat, props.lng)
)
const hasAnyMagicHour = computed(() => polarStateExplanation.value === '')
</script>
