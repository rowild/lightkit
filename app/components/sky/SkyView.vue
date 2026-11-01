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
          tabindex="-1"
          class="fixed inset-x-0 top-0 h-svh z-5500 flex flex-col text-ink outline-none bg-[radial-gradient(120%_90%_at_50%_38%,#0b1418_0%,#05080a_70%)]"
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

          <!-- z-20: stays above the text on the right, whose toggle lives here. -->
          <div class="relative z-20 flex items-center gap-2 px-3 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div class="relative grow min-w-0 max-w-md">
              <label for="sky-search" class="sr-only">Search a place</label>
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
                :size="14"
                :stroke-width="1.75"
              />
              <input
                id="sky-search"
                v-model="query"
                type="text"
                autocomplete="off"
                :disabled="offline"
                placeholder="Search a place"
                class="w-full h-10 pl-9 pr-3 rounded-xl glow-input t-body-sm disabled:opacity-60"
                @input="onInput"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <ul
                v-if="showResults && results.length"
                class="absolute left-0 right-0 top-full mt-1 glass-panel rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-brand-green-800/30"
              >
                <li v-for="result in results" :key="result.place_id">
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2.5 t-body-sm text-ink hover:bg-brand-green-500/15 cursor-pointer"
                    @click="choose(result)"
                  >
                    {{ result.display_name }}
                  </button>
                </li>
              </ul>
            </div>
            <span class="t-label-xs normal-case shrink-0">{{ dateLabel }}</span>

            <!-- Pushed to the far corner, away from the field: an X beside a text
                 input reads as "clear this". The negative margin lets the X's ink
                 line up with the bar's padding while the hit area stays whole. -->
            <div class="ml-auto -mr-2.5 flex items-center shrink-0">
              <button
                ref="infoEl"
                type="button"
                aria-controls="sky-about"
                :aria-expanded="aboutOpen"
                aria-label="What this view shows"
                v-tooltip="'What this view shows'"
                class="tap w-10 h-10 grid place-items-center rounded-full cursor-pointer sky-info"
                :class="aboutOpen ? 'is-lit' : ''"
                @click="aboutOpen = !aboutOpen"
              >
                <Info :size="20" :stroke-width="1.75" />
              </button>
              <button
                ref="closeEl"
                type="button"
                aria-label="Close the sky view"
                v-tooltip="'Close the sky view'"
                class="tap w-10 h-10 grid place-items-center rounded-full text-ink-faint hover:text-ink transition-colors cursor-pointer"
                @click="close"
              >
                <X :size="20" :stroke-width="1.75" />
              </button>
            </div>
          </div>

          <!-- The explanation is a screen on the windshield: a small floating
               frame you read while still looking through it at the planet. It has
               its own X, inside its own frame, because the X in the corner closes
               the whole view. It sits high on the right, where the sky is empty,
               and leaves the stage underneath alone. -->
          <Transition
            enter-active-class="transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            enter-from-class="opacity-0 scale-[0.97] -translate-y-1"
            leave-active-class="transition duration-200 ease-in"
            leave-to-class="opacity-0 scale-[0.98]"
          >
            <section
              v-show="aboutOpen"
              id="sky-about"
              ref="aboutEl"
              aria-labelledby="sky-about-title"
              class="sky-window absolute z-15 flex flex-col origin-top-right rounded-xl"
            >
              <div class="shrink-0 flex items-center justify-between gap-3 pl-5 pr-2 pt-2.5 pb-1">
                <h2 id="sky-about-title" class="font-display font-light text-xl leading-none text-ink">Sky view</h2>
                <button
                  type="button"
                  aria-label="Close this text"
                  v-tooltip="'Close this text'"
                  class="tap w-8 h-8 grid place-items-center rounded-full text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  @click="closeAbout"
                >
                  <X :size="16" :stroke-width="1.75" />
                </button>
              </div>

              <div tabindex="0" class="sky-window-text grow min-h-0 overflow-y-auto overscroll-contain select-text pl-5 pr-4 pb-6 pt-1">
                <p class="t-body-sm !text-ink">
                  See the whole day's light at a glance: where the sun travels over your place, and
                  when the light turns golden and blue. Use it to compare places and seasons before
                  you plan a shoot.
                </p>

                <div class="mt-5 flex flex-col gap-3">
                  <p class="t-body-sm">
                    The bow is the sun's path on this date, drawn over the place on top of the planet.
                    Each fan starts at that place and reaches the part of the bow where the light is
                    golden (amber) or blue (cyan).
                  </p>
                  <p class="t-body-sm">
                    <strong class="font-semibold text-ink">Sky path</strong> is the true path across the
                    sky. Golden fans sit just above the horizon ring, blue fans just below it. A low,
                    flat bow means long golden hours.
                  </p>
                  <p class="t-body-sm">
                    <strong class="font-semibold text-ink">Clock</strong> is the Day Schedule bent into a
                    half circle: from one midnight of the sun on the left to the next on the right,
                    morning first.
                  </p>
                  <p class="t-body-sm">
                    A bead marks each full hour; the brighter the bead, the higher the sun. The glowing
                    bands on the planet are everywhere golden or blue hour is happening at the moment
                    the sun marks.
                  </p>
                  <p class="t-body-sm">
                    Tap the planet or search to explore another place. Your place on the solar page does
                    not change. Times are in this device's time zone.
                  </p>
                </div>

                <p class="mt-5 t-body-sm text-[0.8125rem] !text-ink-faint">
                  Earth imagery: NASA Visible Earth (Blue Marble) and NASA Earth Observatory (Black
                  Marble). Land outline: Natural Earth.
                </p>
              </div>
            </section>
          </Transition>

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
              <button
                v-if="exploring"
                type="button"
                class="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl glass-panel t-label text-[11px] text-ink hover:text-brand-glow transition-colors cursor-pointer"
                @click="goHome"
              >
                <LocateFixed :size="14" :stroke-width="1.75" />
                My place
              </button>
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
import { Info, LocateFixed, Search, X } from '@lucide/vue'
import {
  formatCoordinates,
  latestOnly,
  reverseGeocodeName,
  usePlaceSearch,
  type PlaceResult
} from '../../composables/usePlaceSearch'
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
  /** Nobody asked for this opening, so it must not take the focus or get in the
      way if it fails. See `openedByItself` in DaySchedule. */
  openedByItself?: boolean
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
const infoEl = ref<HTMLButtonElement | null>(null)
const aboutEl = ref<HTMLElement | null>(null)

// What the view is for, in a small window on the stage. Closed on every opening.
const aboutOpen = ref(false)
/** Back to the button that opened it, so the keyboard does not lose its place. */
const closeAbout = () => {
  aboutOpen.value = false
  infoEl.value?.focus()
}

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
  [
    polarNote.value,
    earthUnavailable.value ? 'Earth images are not cached yet.' : '',
    offline.value ? 'Search needs a connection.' : ''
  ].filter(Boolean)
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
const exploring = computed(() => place.value.lat !== props.lat || place.value.lng !== props.lng)

// The search field doubles as the name of the place on show.
const { query, results, showResults, onInput, clear: clearSearch, cancel: cancelSearch } = usePlaceSearch()
const nameOf = latestOnly(reverseGeocodeName)
let home: { key: string; name: string } | null = null
const homeKey = () => `${props.lat},${props.lng}`

/** Coordinates at once, then the name when Nominatim answers. */
const nameThePlace = async (lat: number, lng: number, isHome: boolean) => {
  const coordinates = formatCoordinates(lat, lng)
  query.value = coordinates
  const name = await nameOf(lat, lng)
  // undefined: a newer place was picked meanwhile. A changed field: the
  // reader has started typing a search over the coordinates.
  if (!name || query.value !== coordinates) return
  query.value = name
  if (isHome) home = { key: homeKey(), name }
}

const showHomeName = () => {
  if (home?.key === homeKey()) query.value = home.name
  else nameThePlace(props.lat, props.lng, true)
}

const pickPlace = (lat: number, lng: number) => {
  cancelSearch()
  place.value = { lat, lng }
  showResults.value = false
  nameThePlace(lat, lng, false)
}

const choose = (result: PlaceResult) => {
  cancelSearch()
  place.value = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) }
  query.value = result.display_name
  showResults.value = false
}

const goHome = () => {
  cancelSearch()
  place.value = { lat: props.lat, lng: props.lng }
  showResults.value = false
  showHomeName()
}

const offline = ref(false)
const onOnline = () => {
  offline.value = false
}
const onOffline = () => {
  offline.value = true
  showResults.value = false
}

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

/** A failure on an opening nobody asked for just leaves the page underneath. */
const failed = (reason: Status) => {
  status.value = reason
  if (props.openedByItself) close()
}

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
    if (id === session) failed('needs-connection')
    return
  }
  if (id !== session || !canvasEl.value || !labelEl.value) return
  try {
    scene = sceneModule.createSkyScene({
      canvas: canvasEl.value,
      labelLayer: labelEl.value,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      labelsKeepClear: () => {
        if (!aboutOpen.value || !aboutEl.value) return null
        const box = aboutEl.value.getBoundingClientRect()
        return { x0: box.left, y0: box.top, x1: box.right, y1: box.bottom }
      }
    })
  } catch (err) {
    console.error('[SkyView] WebGL is unavailable', err)
    failed('no-webgl')
    return
  }
  scene.onPick(pickPlace)
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
  // One thing per Escape: the result list, then the text, then the view.
  if (showResults.value) {
    showResults.value = false
    return
  }
  if (aboutOpen.value) {
    closeAbout()
    return
  }
  close()
}

let returnFocusTo: HTMLElement | null = null
watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    clearSearch()
    returnFocusTo?.focus()
    returnFocusTo = null
    return
  }
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  place.value = { lat: props.lat, lng: props.lng }
  aboutOpen.value = false
  earthUnavailable.value = false
  offline.value = !navigator.onLine
  showHomeName()
  await nextTick()
  // After a tap the close button is the right place for the focus. On a page
  // that has just loaded it would count as keyboard focus, and show its ring and
  // its tooltip to someone who has not touched anything yet.
  if (props.openedByItself) rootEl.value?.focus()
  else closeEl.value?.focus()
  start()
})

// A first visit has no location yet when the view opens by itself: it arrives
// from the browser a moment later. Follow it, unless the reader has already
// gone exploring somewhere else.
watch(() => [props.lat, props.lng] as const, ([lat, lng], [oldLat, oldLng]) => {
  if (!props.open || place.value.lat !== oldLat || place.value.lng !== oldLng) return
  place.value = { lat, lng }
  showHomeName()
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  stop()
})
</script>

<style scoped>
/* A corona, like the eclipsed sun's on this stage: light that thins out with
   distance, cyan near the button and indigo further off. The button itself stays
   clear, so the stars still show through it. */
.sky-info {
  color: var(--color-ink-faint);
  transition: color 300ms ease, box-shadow 500ms cubic-bezier(0.16, 1, 0.3, 1);
}

.sky-info:hover {
  color: var(--color-ink);
}

.sky-info.is-lit {
  color: #d4ecff;
  box-shadow:
    inset 0 0 12px rgba(140, 192, 230, 0.3),
    0 0 16px rgba(140, 192, 230, 0.5),
    0 0 48px rgba(92, 104, 235, 0.38);
}

.sky-info.is-lit :deep(svg) {
  filter: drop-shadow(0 0 5px rgba(160, 208, 245, 0.9));
}

/* Top right, clear of the bar and the screen's edges.

   A quarter of the screen tall, with a floor of 16rem: two thirds of a phone held
   sideways, the smallest screen that still has to carry it. The cap keeps it on
   that phone when the floor alone would run off the bottom.

   The background is only a breath of tint. What keeps the text readable over a
   bright planet is the shadow on the type, so the universe stays in view. */
.sky-window {
  top: calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem);
  right: max(1.25rem, env(safe-area-inset-right));
  width: min(26rem, calc(100% - 2.5rem));
  height: max(25svh, 16rem);
  max-height: calc(100svh - max(0.75rem, env(safe-area-inset-top)) - 4.25rem);
  background: rgba(5, 10, 16, 0.14);
  border: 1px solid rgba(140, 192, 230, 0.24);
  box-shadow:
    0 0 28px rgba(140, 192, 230, 0.07),
    inset 0 0 28px rgba(140, 192, 230, 0.05);
  text-shadow:
    0 0 2px rgba(3, 6, 10, 0.95),
    0 0 10px rgba(3, 6, 10, 0.9),
    0 1px 3px rgba(3, 6, 10, 0.9);
}

@media (min-width: 64rem) {
  .sky-window {
    right: max(2rem, env(safe-area-inset-right));
  }
}

/* The text dissolves at the frame's edges instead of being cut off by it, which
   also says there is more to scroll. */
.sky-window-text {
  scrollbar-color: rgba(140, 192, 230, 0.35) transparent;
  mask-image: linear-gradient(to bottom, transparent 0, #000 0.5rem, #000 calc(100% - 1.75rem), transparent 100%);
}
</style>
