<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-200 ease-in"
        leave-to-class="opacity-0"
        @after-leave="stop"
      >
        <!-- Always dark (spec rule 3). data-theme here flips every token and
             dark: variant inside, whatever theme the page is in. h-svh, not
             inset-0: see InfoModal - fixed boxes measure the LARGE viewport on
             a phone and would hang below the fold. -->
        <div
          v-if="open"
          ref="rootEl"
          data-theme="dark"
          role="dialog"
          aria-modal="true"
          aria-label="Sky view"
          class="fixed inset-x-0 top-0 h-svh z-5500 flex flex-col text-ink bg-[radial-gradient(120%_90%_at_50%_38%,#0b1418_0%,#05080a_70%)]"
        >
          <ul class="sr-only">
            <li v-for="line in windowSummary" :key="line">{{ line }}</li>
          </ul>

          <!-- Hidden until ready: while the planet's images load, the bow would
               otherwise stand alone in space and then vanish for the opening. -->
          <div
            class="absolute inset-0 transition-opacity duration-500"
            :class="status === 'ready' ? 'opacity-100' : 'opacity-0'"
          >
            <canvas ref="canvasEl" class="block w-full h-full touch-none" aria-hidden="true"></canvas>
            <div ref="labelEl" class="absolute inset-0 pointer-events-none" aria-hidden="true"></div>
          </div>

          <div v-if="status !== 'ready'" class="absolute inset-0 grid place-items-center pointer-events-none">
            <span
              v-if="status === 'loading'"
              role="status"
              aria-label="Loading the sky view"
              class="block h-8 w-8 rounded-full border border-brand-glow/70 animate-ping"
            ></span>
            <p v-else class="max-w-xs px-6 text-center t-body-sm text-ink-muted">{{ failureText }}</p>
          </div>

          <div class="relative z-10 flex items-center gap-2 px-3 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div class="grow min-w-0"></div>
            <span class="t-label-xs normal-case shrink-0">{{ dateLabel }}</span>
            <button
              ref="closeEl"
              type="button"
              aria-label="Close the sky view"
              v-tooltip="'Close the sky view'"
              class="tap grid items-center justify-end rounded-full text-ink-faint hover:text-ink transition-colors cursor-pointer shrink-0"
              @click="close"
            >
              <X :size="22" :stroke-width="1.75" />
            </button>
          </div>

          <div class="grow"></div>

          <div class="relative z-10 flex flex-col items-center gap-2 px-3 sm:px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p
              v-for="note in notes"
              :key="note"
              class="glass-panel rounded-xl px-3 py-2 max-w-md text-center t-body-sm text-ink-muted"
            >
              {{ note }}
            </p>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <div role="radiogroup" aria-label="Bow" class="inline-flex p-0.5 rounded-xl glass-panel">
                <button
                  v-for="option in BOW_OPTIONS"
                  :key="option.value"
                  type="button"
                  role="radio"
                  :aria-checked="bow === option.value"
                  class="h-9 px-3 rounded-lg t-label text-[11px] transition-colors cursor-pointer"
                  :class="bow === option.value ? 'bg-brand-glow/20 text-ink' : 'text-ink-faint hover:text-ink'"
                  @click="storedBow = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
              <div role="radiogroup" aria-label="Planet" class="inline-flex p-0.5 rounded-xl glass-panel">
                <button
                  v-for="option in PLANET_OPTIONS"
                  :key="option.value"
                  type="button"
                  role="radio"
                  :aria-checked="planet === option.value"
                  class="h-9 px-3 rounded-lg t-label text-[11px] transition-colors cursor-pointer"
                  :class="planet === option.value ? 'bg-brand-glow/20 text-ink' : 'text-ink-faint hover:text-ink'"
                  @click="choosePlanet(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * The sky view: a full-screen overlay over the solar page showing a small
 * planet, the sun's path as a bow over the selected place, and fans of light
 * from the place to the golden and blue parts of the bow.
 *
 * This component owns the overlay, the place on show and the remembered
 * choices. The Three.js scene is `utils/sky/scene.ts`, imported only when the
 * overlay opens. Spec: docs/superpowers/specs/2026-10-10-sky-view-design.md.
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { X } from '@lucide/vue'
import { usePersistedRef } from '../../composables/usePersistedRef'
import { useNow } from '../../composables/useNow'
import { useSun } from '../../composables/useSun'
import { buildSkyModel, sunSample, sunTimeFor, type BowMode } from '../../utils/skyGeometry'
import { orientationFor } from '../../utils/globeMath'
import type { SkyScene, PlanetMode } from '../../utils/sky/scene'

const props = defineProps<{
  open: boolean
  lat: number
  lng: number
  date: Date
}>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()

const BOW_OPTIONS = [
  { value: 'sky', label: 'Sky path' },
  { value: 'clock', label: 'Clock' }
] as const
const PLANET_OPTIONS = [
  { value: 'earth', label: 'Earth' },
  { value: 'dots', label: 'Dots' }
] as const

const rootEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const labelEl = ref<HTMLElement | null>(null)
const closeEl = ref<HTMLButtonElement | null>(null)

// Remembered choices (spec 6.4). Anything else found in storage falls back.
const storedBow = usePersistedRef<string>('sky-bow', 'sky')
const storedPlanet = usePersistedRef<string>('sky-planet', 'earth')
const bow = computed<BowMode>(() => (storedBow.value === 'clock' ? 'clock' : 'sky'))
const chosenPlanet = computed<PlanetMode>(() => (storedPlanet.value === 'dots' ? 'dots' : 'earth'))
// Missing Earth images fall back to Dots for this opening only. The remembered
// choice stays, so the next opening with a connection gets Earth again.
const earthUnavailable = ref(false)
const planet = computed<PlanetMode>(() => (earthUnavailable.value ? 'dots' : chosenPlanet.value))
const choosePlanet = (mode: PlanetMode) => {
  storedPlanet.value = mode
  if (mode === 'earth') earthUnavailable.value = false
}

const sunCalc = useSun()
const polarNote = computed(() => sunCalc.getPolarExplanation(props.date, place.value.lat, place.value.lng))

// Short notes above the switches: why something the reader expects is missing.
const notes = computed(() =>
  [polarNote.value, earthUnavailable.value ? 'Earth images are not cached yet.' : ''].filter(Boolean)
)

const formatTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
// The canvas is hidden from screen readers; this list says what the fans draw.
const windowSummary = computed(() =>
  model.value.windows
    .filter(w => w.kind !== 'day')
    .map(w => `${w.name}: ${formatTime(w.start)} to ${formatTime(w.end)}`)
)

// The place on show. It starts at the page's place and is never written back
// (spec rule 1): comparing places must not overwrite a launch site.
const place = ref({ lat: props.lat, lng: props.lng })

const now = useNow()
const model = computed(() => buildSkyModel(props.date, place.value.lat, place.value.lng))
const orientation = computed(() => orientationFor(place.value.lat, place.value.lng))
const sun = computed(() =>
  sunSample(model.value, sunTimeFor(props.date, place.value.lat, place.value.lng, now.value))
)

const dateLabel = computed(() =>
  props.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
)

type Status = 'loading' | 'ready' | 'no-webgl' | 'needs-connection'
const status = ref<Status>('loading')
const failureText = computed(() =>
  status.value === 'no-webgl'
    ? 'This device cannot draw the sky view. The Day Schedule shows the same windows.'
    : 'The sky view needs a connection the first time it opens.'
)

let scene: SkyScene | null = null
let session = 0
let resizeObserver: ResizeObserver | null = null

const close = () => emit('update:open', false)

const stop = () => {
  session++
  resizeObserver?.disconnect()
  resizeObserver = null
  scene?.dispose()
  scene = null
}

const applyPlanet = async (animate: boolean) => {
  if (!scene) return
  try {
    await scene.setPlanet(planet.value, { animate })
  } catch (err) {
    console.warn('[SkyView] Earth images unavailable, showing Dots', err)
    earthUnavailable.value = true
  }
}

const start = async () => {
  stop()
  const id = session
  status.value = 'loading'
  let sceneModule: typeof import('../../utils/sky/scene')
  try {
    sceneModule = await import('../../utils/sky/scene')
  } catch (err) {
    console.error('[SkyView] The scene could not load', err)
    if (id === session) status.value = 'needs-connection'
    return
  }
  if (id !== session || !canvasEl.value || !labelEl.value) return
  try {
    scene = sceneModule.createSkyScene({
      canvas: canvasEl.value,
      labelLayer: labelEl.value,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })
  } catch (err) {
    console.error('[SkyView] WebGL is unavailable', err)
    status.value = 'no-webgl'
    return
  }
  scene.setModel(model.value, orientation.value, { animate: false })
  scene.setBow(bow.value, { animate: false })
  scene.setSun(sun.value, orientation.value)
  await applyPlanet(false)
  if (id !== session || !scene) return
  resizeObserver = new ResizeObserver(() => scene?.resize())
  resizeObserver.observe(canvasEl.value)
  status.value = 'ready'
  scene.playIntro()
}

// Model before sun: the sun watcher hands the scene the new place's orientation.
watch(() => (props.open ? model.value : null), (next) => {
  if (next) scene?.setModel(next, orientation.value, { animate: true })
})
watch(() => (props.open ? sun.value : null), (next) => {
  if (next) scene?.setSun(next, orientation.value)
})
watch(bow, (next) => scene?.setBow(next, { animate: true }))
watch(planet, () => applyPlanet(true))

/** Escape closes the view, unless a dialog opened on top of it has the focus. */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !props.open) return
  const target = event.target as Node | null
  if (target && target !== document.body && !rootEl.value?.contains(target)) return
  close()
}

let returnFocusTo: HTMLElement | null = null
watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    returnFocusTo?.focus()
    returnFocusTo = null
    return
  }
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  place.value = { lat: props.lat, lng: props.lng }
  earthUnavailable.value = false
  await nextTick()
  closeEl.value?.focus()
  start()
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  stop()
})
</script>
