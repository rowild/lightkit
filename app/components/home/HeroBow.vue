<template>
  <figure class="flex flex-col gap-2">
    <!-- Today's real sun, not an illustration: the line is its altitude through
         the day, in the same phases as the Day Schedule. The dot is the sun now. -->
    <svg viewBox="0 0 600 120" class="block w-full h-auto overflow-visible" aria-hidden="true">
      <line x1="0" x2="600" :y1="HORIZON" :y2="HORIZON" class="stroke-ink-faint/40" stroke-width="1" />
      <polyline
        v-for="(run, i) in runs"
        :key="i"
        :points="run.points"
        fill="none"
        stroke-linecap="round"
        :class="run.className"
        :stroke-width="run.magic ? 2.5 : 1"
        :stroke-dasharray="run.night ? '1 5' : undefined"
      />
      <circle class="hero-halo" :cx="sun.x" :cy="sun.y" r="9" :class="sun.up ? 'fill-brand-glow-amber' : 'fill-brand-glow-cyan'" />
      <circle
        :cx="sun.x"
        :cy="sun.y"
        r="4.5"
        stroke-width="1.5"
        :class="sun.up ? 'fill-brand-glow-amber stroke-brand-glow-amber' : 'fill-bg-dark stroke-brand-glow-cyan'"
      />
    </svg>

    <figcaption class="t-body-sm">
      <span class="text-ink font-semibold">{{ current }}</span> now.
      <template v-if="next">
        {{ next.name }} at <span class="t-num-sm text-ink">{{ next.time }}</span> {{ next.day }}.
      </template>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
/**
 * The light right now, at the top of the start page.
 *
 * The solar page's remembered place when there is one. A first visitor gets a
 * place guessed from the device's time zone instead of a location prompt: nobody
 * has asked for anything yet, and the phase comes out right near enough.
 */
import { computed } from 'vue'
import { useNow } from '../../composables/useNow'
import { readPersisted } from '../../composables/usePersistedRef'
import { useSun, type SolarSegment } from '../../composables/useSun'

const HORIZON = 62
const SAMPLES = 144

const sunCalc = useSun()
const now = useNow(60_000)

const lat = readPersisted<number>('lat', 47)
const lng = readPersisted<number>('lng', -new Date().getTimezoneOffset() / 4)

const segments = computed(() => sunCalc.getSolarSegments(now.value, lat, lng))

const span = computed(() => {
  const list = segments.value
  const start = list[0]?.start.getTime() ?? now.value.getTime()
  const end = list[list.length - 1]?.end.getTime() ?? start + 86400000
  return { start, length: Math.max(1, end - start) }
})

const altitudeAt = (ms: number) => sunCalc.getSunPosition(new Date(ms), lat, lng).altitude

const peak = computed(() => {
  let highest = 1
  for (let i = 0; i <= SAMPLES; i++) {
    highest = Math.max(highest, Math.abs(altitudeAt(span.value.start + (span.value.length * i) / SAMPLES)))
  }
  return highest
})

const toPoint = (ms: number) => ({
  x: ((ms - span.value.start) / span.value.length) * 600,
  y: HORIZON - (altitudeAt(ms) / peak.value) * 52
})

const phaseOf = (segment: SolarSegment | undefined) => {
  const name = segment?.name ?? ''
  if (name.includes('Golden')) return { className: 'stroke-brand-glow-amber', magic: true, night: false }
  if (name.includes('Blue')) return { className: 'stroke-brand-glow-cyan', magic: true, night: false }
  if (name.includes('Day')) return { className: 'stroke-ink-muted', magic: false, night: false }
  return { className: 'stroke-ink-faint', magic: false, night: true }
}

/** One polyline per phase, so each can be coloured as the Day Schedule does. */
const runs = computed(() =>
  segments.value.map((segment) => {
    const from = segment.start.getTime()
    const to = segment.end.getTime()
    const steps = Math.max(2, Math.ceil(((to - from) / span.value.length) * SAMPLES))
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const point = toPoint(from + ((to - from) * i) / steps)
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
    }).join(' ')
    return { points, ...phaseOf(segment) }
  })
)

const sun = computed(() => {
  const ms = Math.min(span.value.start + span.value.length, Math.max(span.value.start, now.value.getTime()))
  return { ...toPoint(ms), up: altitudeAt(ms) > 0 }
})

const current = computed(() => sunCalc.getCurrentSegment(now.value, segments.value)?.name ?? 'Night')

const formatTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

/** The next golden or blue hour, today or tomorrow. */
const next = computed(() => {
  const isWindow = (s: SolarSegment) => s.name.includes('Golden') || s.name.includes('Blue')
  const later = (list: SolarSegment[]) =>
    list.find(s => isWindow(s) && s.start.getTime() > now.value.getTime())

  const today = later(segments.value)
  if (today) return { name: today.name, time: formatTime(today.start), day: 'today' }

  const tomorrow = later(sunCalc.getSolarSegments(new Date(now.value.getTime() + 86400000), lat, lng))
  return tomorrow ? { name: tomorrow.name, time: formatTime(tomorrow.start), day: 'tomorrow' } : null
})
</script>

<style scoped>
.hero-halo {
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0.25;
  animation: hero-halo 5s ease-in-out infinite;
}

@keyframes hero-halo {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.6); opacity: 0.1; }
}
</style>
