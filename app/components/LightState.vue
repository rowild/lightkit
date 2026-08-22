<template>
  <div class="glass-panel p-3 sm:p-4 lg:p-6 rounded-2xl shadow-sm flex flex-col gap-3 lg:gap-6">

    <!-- Current state leads: what is happening right now outranks what happens
         next. Same card shape as the next-window block below it. The phase
         explanation lives in the modal, not inline. -->
    <div
      v-if="currentSegment"
      class="p-3 sm:p-4 rounded-xl bg-brand-petrol-800/5 dark:bg-brand-green-800/40 border border-brand-petrol-800/12 dark:border-brand-green-800/30"
    >
      <!-- Label and phase name share one line on a phone, the name right
           aligned at label size, which saves a row on a screen that has to
           carry four blocks. A desktop keeps the name on its own line at
           display size. -->
      <div class="flex items-baseline justify-between gap-3 lg:block">
        <div class="flex items-center gap-2 shrink-0">
          <p class="t-label text-[11px] sm:text-xs">Current state</p>
          <!-- Only golden and blue hour pulse. A dot that beats through the
               whole day says nothing; one that appears when the light is worth
               flying for says everything. -->
          <span v-if="isMagicNow" class="relative inline-flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" :class="statusDotColor"></span>
            <span class="relative inline-flex rounded-full h-2 w-2" :class="statusDotColor"></span>
          </span>
        </div>
        <p
          class="t-label text-[11px] sm:text-xs min-w-0 truncate text-right lg:mt-1 lg:text-left lg:font-display lg:text-base lg:font-semibold lg:tracking-wide lg:leading-snug"
          :class="currentStateColorClass"
        >
          {{ currentSegment.name }}
        </p>
      </div>

      <!-- The countdown leads at every size: how long you have left is what
           you act on, and the range behind it is the reference. Only the sizes
           differ between a phone and a desktop. -->
      <div class="mt-1.5 sm:mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span class="order-2 t-num text-ink text-[10px] lg:text-sm">
          {{ formatTime(currentSegment.start) }}&ndash;{{ formatTime(currentSegment.end) }}
        </span>
        <span class="order-1 t-label text-[10px] lg:text-xs whitespace-nowrap">
          ends in <span class="t-num-sm text-ink text-[10px] lg:text-[13px]">{{ currentSegmentEndsIn }}</span>
        </span>
      </div>
    </div>

    <!-- Next window. Within an hour the countdown is the headline; before that
         the date and time matter more, and the countdown shrinks to a caption. -->
    <div
      v-if="nextMagicWindowInfo"
      class="p-3 sm:p-4 rounded-xl bg-brand-petrol-800/6 dark:bg-brand-green-800/40 border border-brand-petrol-800/12 dark:border-brand-green-800/35"
    >
      <div class="flex items-baseline justify-between gap-3 lg:block">
        <p class="t-label text-[11px] sm:text-xs shrink-0">Next window</p>
        <p
          class="t-label text-[11px] sm:text-xs min-w-0 truncate text-right lg:mt-1 lg:text-left lg:font-display lg:text-base lg:font-semibold lg:tracking-wide lg:leading-snug"
          :class="nextWindowColorClass"
        >
          {{ nextMagicWindowInfo.name }}
        </p>
      </div>

      <!-- Imminent: countdown large. -->
      <div v-if="nextMagicWindowInfo.isImminent" class="mt-2 sm:mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span class="t-hero-num" :class="nextWindowColorClass">
          {{ nextMagicWindowInfo.countdown }}
        </span>
        <span class="t-label text-[11px] sm:text-xs whitespace-nowrap">
          starts <span class="t-num-sm text-ink">{{ nextMagicWindowInfo.startTime }}</span>
        </span>
      </div>

      <!-- Further off: when the window opens AND when it shuts. A start time
           alone says when to be there and nothing about how long you have once
           you are - which for a golden hour that lasts 20 minutes at one
           latitude and two hours at another is the more useful half.

           The range sits on the right at every size, under the phase name it
           belongs to and in that phase's colour, with the countdown leading on
           the left. A desktop has room to put the day label on its own line
           beneath the range rather than in front of it. -->
      <div v-else class="mt-2 sm:mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div class="order-2 flex items-baseline gap-2 min-w-0 lg:flex-col lg:items-end lg:gap-1">
          <span class="order-1 lg:order-2 t-label-xs">{{ nextMagicWindowInfo.startDate }}</span>
          <span
            class="order-2 lg:order-1 font-mono tabular-nums text-[11px] lg:text-2xl font-light leading-none"
            :class="nextWindowColorClass"
          >
            {{ nextMagicWindowInfo.startTime }}&ndash;{{ nextMagicWindowInfo.endTime }}
          </span>
        </div>
        <span class="order-1 t-label-xs whitespace-nowrap">
          in <span class="t-num-sm text-ink text-[10px] lg:text-[13px]">{{ nextMagicWindowInfo.startsIn }}</span>
        </span>
      </div>

      <!-- Plex, not the caps role. `.t-label` is set in Josefin Caps, whose
           alias has NO reserved descent - the g of "Light" would hang outside
           its own line box. Lowercase belongs to the text face. -->
      <button
        type="button"
        class="lg:hidden mt-2.5 ml-auto flex w-fit items-center gap-1 t-body-sm text-[10px] hover:text-ink transition-colors cursor-pointer"
        @click="windowsOpen = true"
      >
        Light windows
        <Info :size="11" :stroke-width="2" />
      </button>
    </div>

    <!-- Same link again for the polar case, where there is no next window and
         the card above it never renders. Without it the polar notice inside the
         dialog would be unreachable on a phone - which is precisely the day a
         pilot most needs to read it. -->
    <button
      v-else
      type="button"
      class="lg:hidden flex self-end items-center gap-1 t-body-sm text-[10px] hover:text-ink transition-colors cursor-pointer"
      @click="windowsOpen = true"
    >
      Light windows
      <Info :size="11" :stroke-width="2" />
    </button>

    <!-- On a desktop the windows stay on the page, under the state cards. -->
    <div class="hidden lg:block">
      <LightWindows :lat="lat" :lng="lng" :date="date" />
    </div>

    <!-- On a phone they live here instead, so the schedule, the map and both
         state cards fit one screen. -->
    <InfoModal v-model:open="windowsOpen" title="Light windows">
      <LightWindows :lat="lat" :lng="lng" :date="date" />
    </InfoModal>
  </div>
</template>

<script setup lang="ts">
/**
 * What the light is doing now, and what it does next.
 *
 * Split out of `SunTimeline.vue` on 2026-08-17, together with `DaySchedule`:
 * on a phone the map sits between the two, which one component cannot do.
 */
import { ref, computed } from 'vue'
import { Info } from '@lucide/vue'
import { useSun, type SolarSegment } from '../composables/useSun'
import { useNow } from '../composables/useNow'
import InfoModal from './InfoModal.vue'
import LightWindows from './LightWindows.vue'

// Below this, the countdown becomes the headline; above it, the date and time
// of the window matter more than the exact seconds remaining.
const IMMINENT_MS = 60 * 60 * 1000

const props = defineProps<{
  lat: number
  lng: number
  date: Date
}>()

const sunCalc = useSun()
const now = useNow()

const windowsOpen = ref(false)

const segments = computed<SolarSegment[]>(() =>
  sunCalc.getSolarSegments(props.date, props.lat, props.lng)
)

const isToday = computed(() => {
  const d1 = props.date
  const d2 = now.value
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
})

const currentSegment = computed<SolarSegment | null>(() => {
  const referenceTime = isToday.value ? now.value : props.date
  return sunCalc.getCurrentSegment(referenceTime, segments.value)
})

// How much of the current phase is left. Shown next to its time range.
const currentSegmentEndsIn = computed(() => {
  const seg = currentSegment.value
  if (!seg) return '--'
  const diff = seg.end.getTime() - (isToday.value ? now.value.getTime() : props.date.getTime())
  return diff > 0 ? formatDiff(diff) : '--'
})

// Calculate the next upcoming magic hour window (relative to now)
const nextMagicWindowInfo = computed(() => {
  const currentMs = now.value.getTime()
  const isTarget = (seg: SolarSegment) => seg.name.includes('Golden') || seg.name.includes('Blue')

  // Look ahead in today's segments (ignoring current window end times)
  for (const seg of segments.value) {
    if (isTarget(seg) && seg.start.getTime() > currentMs) {
      return describeWindow(seg, seg.start.getTime() - currentMs)
    }
  }

  // Look ahead in tomorrow's segments
  const tomorrow = new Date(props.date.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowSegs = sunCalc.getSolarSegments(tomorrow, props.lat, props.lng)
  for (const seg of tomorrowSegs) {
    if (isTarget(seg)) {
      const diff = seg.start.getTime() - currentMs
      if (diff > 0) {
        return describeWindow(seg, diff)
      }
    }
  }

  return null
})

const describeWindow = (seg: SolarSegment, diff: number) => ({
  name: seg.name,
  isImminent: diff <= IMMINENT_MS,
  countdown: formatCountdown(diff),
  startsIn: formatDiff(diff),
  startTime: formatTime(seg.start),
  endTime: formatTime(seg.end),
  startDate: formatDayLabel(seg.start)
})

// "Today" / "Tomorrow" beat a bare date for something happening within a day or
// two; anything further off gets a real date.
const formatDayLabel = (d: Date) => {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOfDay(d) - startOfDay(now.value)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

const formatTime = (d: Date | undefined) => {
  if (!d || isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Fixed-width H:MM:SS for the hero. The `now` ref already ticks once a second,
// so this counts down on its own. It is set in the mono stack because Josefin
// Sans has no tabular figures - its "0" is nearly twice the width of its "1",
// which would make the countdown jump sideways on every tick.
const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${hours}:${pad(minutes)}:${pad(seconds)}`
}

const formatDiff = (ms: number) => {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

// The pulse marks the light a pilot is waiting for, and nothing else.
const isMagicNow = computed(() => {
  const name = currentSegment.value?.name || ''
  return name.includes('Golden') || name.includes('Blue')
})

const statusDotColor = computed(() => {
  const name = currentSegment.value?.name || ''
  return name.includes('Golden') ? 'bg-brand-glow-amber' : 'bg-brand-glow-cyan'
})

const currentStateColorClass = computed(() => {
  const name = currentSegment.value?.name || ''
  if (name.includes('Golden')) return 'text-brand-glow-amber'
  if (name.includes('Blue')) return 'text-brand-glow-cyan'
  return 'text-ink'
})

const nextWindowColorClass = computed(() => {
  const name = nextMagicWindowInfo.value?.name || ''
  return name.includes('Golden') ? 'text-brand-glow-amber' : 'text-brand-glow-cyan'
})
</script>
