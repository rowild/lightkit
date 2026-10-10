<template>
  <!-- One positioning context for the controls and the map.

       Below lg the search panel floats ON the map, in the gap between the zoom
       buttons and the offline save, so that a pilot can tap a spot and read the
       light without scrolling. From lg it flows above the map as its own card,
       which is the arrangement a desktop has room for. -->
  <div class="relative flex flex-col h-full min-h-0 gap-3 lg:gap-4">

    <!-- Search, date and coordinates -->
    <div
      class="absolute top-1.5 left-10 right-10 z-[1000] flex flex-col gap-0.5 p-1 rounded-xl glass-panel shadow-lg
             lg:static lg:z-20 lg:gap-3 lg:p-4 lg:rounded-2xl lg:shadow-none"
    >
      <div class="flex items-end gap-1.5 lg:gap-3 w-full">

        <!-- Search Bar (takes remaining space) -->
        <div class="grow relative z-[1010] flex flex-col gap-1.5 min-w-0">
          <!-- The label is read out but not drawn on a phone: the magnifier
               says the same thing in the width of one glyph. -->
          <label for="location-search" class="t-label sr-only lg:not-sr-only">
            Search location
          </label>
          <div class="relative">
            <Search class="absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" :size="13" :stroke-width="1.75" />
            <input
              id="location-search"
              type="text"
              v-model="searchQuery"
              @input="onSearchInput"
              placeholder="Search city, landmark..."
              class="w-full pl-7 pr-8 lg:pl-10 lg:pr-11 rounded-xl glow-input t-body-sm text-[12px] lg:text-sm h-8 lg:h-11"
            />
            <button
              v-if="searchQuery"
              @click="clearSearch"
              aria-label="Clear search"
              v-tooltip="'Clear the search field'"
              class="absolute right-0.5 lg:right-1 top-1/2 -translate-y-1/2 h-7 w-7 lg:h-10 lg:w-10 grid place-items-center rounded-lg text-ink-faint hover:text-ink"
            >
              <X :size="13" :stroke-width="1.75" />
            </button>
            <button
              v-else
              @click="locateMe"
              :disabled="locating"
              class="absolute right-0.5 lg:right-1 top-1/2 -translate-y-1/2 h-7 w-7 lg:h-10 lg:w-10 grid place-items-center rounded-lg text-ink-faint hover:text-brand-petrol-600 dark:hover:text-brand-glow disabled:opacity-50 transition-colors"
              aria-label="Use current location"
              v-tooltip="'Jump to where you are now'"
            >
              <Navigation :size="13" :class="locating ? 'animate-pulse' : ''" :stroke-width="1.75" />
            </button>
          </div>

          <!-- Search Results Dropdown -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <ul
              v-if="searchResults.length > 0 && showResults"
              class="absolute left-0 right-0 top-full mt-1 lg:mt-2 bg-white/95 dark:bg-bg-dark/95 border border-brand-petrol-800/10 dark:border-brand-green-800/20 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[1020] divide-y divide-gray-100 dark:divide-brand-green-800/10 text-xs backdrop-blur-md"
            >
              <li
                v-for="result in searchResults"
                :key="result.place_id"
                @click="selectResult(result)"
                class="px-3 py-2.5 lg:px-4 lg:py-3 hover:bg-brand-petrol-800/8 dark:hover:bg-brand-green-500/15 cursor-pointer transition-colors t-body-sm text-[12px] lg:text-sm"
              >
                {{ result.display_name }}
              </li>
            </ul>
          </Transition>
        </div>

        <!-- Date Picker -->
        <div class="w-[104px] lg:w-[150px] shrink-0 flex flex-col gap-1.5">
          <label for="flight-date" class="t-label sr-only lg:not-sr-only">
            Date
          </label>
          <input
            id="flight-date"
            type="date"
            :value="dateStr"
            @input="$emit('update:dateStr', ($event.target as HTMLInputElement).value)"
            class="w-full px-1.5 lg:px-3 rounded-xl glow-input t-num-sm text-[11px] lg:text-[13px] h-8 lg:h-11"
          />
        </div>
      </div>

      <!-- Coordinates. One inline run, so the label and both values share a
           baseline and the pair wraps as prose rather than as flex columns.
           The word is dropped on a phone, where the whole panel is 220px wide
           and the numbers are the part that changes. -->
      <!-- row-kv, so the weather summary on the right keeps its width and the
           coordinates give way rather than the pair wrapping into two lines. -->
      <div class="row-kv lg:pl-0.5">
        <p class="t-label-xs truncate">
          <span class="hidden lg:inline">Coordinates:&nbsp;</span>
          <!-- No `text-ink` here: it is a reading of where you are, not a
               number you act on, and at full ink strength it shouted. The role
               class already carries the muted tone. -->
          <span class="t-num-xs">{{ lat.toFixed(4) }}&deg;N&nbsp; | &nbsp;{{ lng.toFixed(4) }}&deg;E</span>
        </p>
        <slot name="meta" />
      </div>
    </div>

    <!-- Map Container.

         No minimum height below lg. The page promises to fit the viewport, so
         a floor here is a floor the flex column cannot honour: on a 667px tall
         phone the map kept its 160px, overflowed the column by 24px, and the
         state panel below was drawn over its own bottom corner. The map takes
         the height the fixed rows leave it, whatever that is. -->
    <div
      class="relative z-10 grow h-0 lg:min-h-[200px] w-full rounded-2xl border border-brand-petrol-800/15 dark:border-brand-green-800/30 overflow-hidden shadow-sm bg-brand-petrol-100/10 dark:bg-black/20"
    >
      <!-- While the wind layer is on, a long press is OUR gesture. The browser
           would otherwise answer it with a context menu or a text-selection
           callout, and the pointer sequence that menu interrupts is never
           finished - which leaves OpenLayers waiting for a pointerup that
           cannot arrive. -->
      <div
        ref="mapContainer"
        class="w-full h-full"
        :class="weatherLayerId === 'wind' ? 'select-none [-webkit-touch-callout:none]' : ''"
      ></div>

      <!-- Map chrome occupies corners that cannot collide: zoom top-left, the
           offline button top-right, the style pill bottom-left and the
           attribution bottom-right. The search panel takes the strip between
           the two top corners, which is why all of it hugs the border.

           None of these carry `.tap`. The 44px floor it enforces is right for a
           button on a page; here it steals the map itself, and every one of
           these controls has a second route - pinch to zoom, and the basemap
           and the offline save are one tap either way. -->
      <!-- One column, so the weather button sits under the zoom pair without a
           hand-tuned offset that breaks the moment either button changes size. -->
      <div ref="topLeftEl" class="absolute top-1.5 left-1.5 lg:top-2 lg:left-2 z-[1000] flex flex-col items-start gap-1.5">
        <div class="flex flex-col bg-white/92 dark:bg-bg-dark/90 backdrop-blur-md border border-brand-petrol-800/15 dark:border-brand-green-800/30 rounded-xl shadow-lg overflow-hidden">
          <button
            @click="zoomBy(1)"
            aria-label="Zoom in"
            v-tooltip="'Zoom in'"
            class="grid place-items-center w-7 h-7 lg:w-8 lg:h-8 hover:bg-brand-petrol-800/10 dark:hover:bg-brand-green-800/40 transition-colors cursor-pointer"
          >
            <Plus class="w-3 h-3 lg:w-[15px] lg:h-[15px]" :stroke-width="2.25" />
          </button>
          <!-- The scale itself, where the controls that change it are. It
               replaces the hairline that used to separate them, so it costs
               almost nothing on a map that has no room to spare. -->
          <div
            class="grid place-items-center w-full py-0.5 border-y border-brand-petrol-800/15 dark:border-brand-green-800/30 font-mono tabular-nums text-[9px] leading-none text-ink-faint select-none"
            aria-hidden="true"
          >{{ currentZoom }}</div>
          <button
            @click="zoomBy(-1)"
            aria-label="Zoom out"
            v-tooltip="'Zoom out'"
            class="grid place-items-center w-7 h-7 lg:w-8 lg:h-8 hover:bg-brand-petrol-800/10 dark:hover:bg-brand-green-800/40 transition-colors cursor-pointer"
          >
            <Minus class="w-3 h-3 lg:w-[15px] lg:h-[15px]" :stroke-width="2.25" />
          </button>
        </div>

        <!-- Weather overlay picker. Only with a key, because without one there
             is nothing behind it. It opens sideways, not down: the map is short
             on a phone and clips its own overflow, so a vertical list would be
             cut off by the map's bottom edge. -->
        <div class="relative">
          <button
            type="button"
            @click="weatherMenuOpen = !weatherMenuOpen"
            aria-haspopup="true"
            :aria-expanded="weatherMenuOpen"
            :aria-label="`Weather overlay: ${activeWeatherLayer.name}`"
            v-tooltip="'Draw the weather over the map'"
            class="grid place-items-center w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-white/92 dark:bg-bg-dark/90 backdrop-blur-md border border-brand-petrol-800/15 dark:border-brand-green-800/30 shadow-lg transition-colors cursor-pointer"
            :class="weatherLayerId ? 'text-brand-glow-cyan' : 'hover:text-ink'"
          >
            <component :is="activeWeatherLayer.icon" class="w-3 h-3 lg:w-[15px] lg:h-[15px]" :stroke-width="2.25" />
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-x-1"
            leave-active-class="transition duration-100 ease-in"
            leave-to-class="opacity-0 -translate-x-1"
          >
            <!-- Same height, same radius and the same `top-0` as the button it
                 comes out of, so the two read as one control that opened rather
                 than as two things that happen to be near each other. Its own
                 buttons take the height that is left and carry the inner radius
                 (6px outer, less the 2px of padding). -->
            <div
              v-if="weatherMenuOpen"
              role="radiogroup"
              aria-label="Weather overlay"
              class="absolute top-0 left-full ml-1 flex items-stretch h-7 lg:h-8 gap-0.5 p-0.5 rounded-xl bg-white/92 dark:bg-bg-dark/90 backdrop-blur-md border border-brand-petrol-800/15 dark:border-brand-green-800/30 shadow-lg"
            >
              <button
                v-for="layer in availableWeatherLayers"
                :key="layer.name"
                type="button"
                role="radio"
                :aria-checked="weatherLayerId === layer.id"
                :aria-label="layer.name"
                v-tooltip="layer.hint"
                @click="selectWeatherLayer(layer.id)"
                class="grid place-items-center w-6 lg:w-7 h-full rounded-lg transition-colors cursor-pointer"
                :class="weatherLayerId === layer.id
                  ? 'bg-brand-petrol-800 text-white dark:bg-brand-glow dark:text-brand-petrol-950'
                  : 'hover:text-ink'"
              >
                <component :is="layer.icon" class="w-3 h-3 lg:w-3.5 lg:h-3.5" :stroke-width="2.25" />
              </button>
            </div>
          </Transition>
        </div>

        <!-- Only while the wind layer is on: the one control that belongs to
             it, next to it. A setting in a drawer two taps away is the wrong
             home for a choice you make while looking at the thing it changes. -->
        <button
          v-if="weatherLayerId === 'wind'"
          type="button"
          @click="windAnimate = !windAnimate"
          :aria-label="windAnimate ? 'Wind as moving lines' : 'Wind as arrows'"
          v-tooltip="windAnimate ? 'Show the wind as arrows instead' : 'Show the wind as moving lines instead'"
          class="grid place-items-center w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-white/92 dark:bg-bg-dark/90 backdrop-blur-md border border-brand-petrol-800/15 dark:border-brand-green-800/30 shadow-lg transition-colors cursor-pointer"
          :class="windAnimate ? 'text-brand-glow-cyan' : 'text-ink-faint hover:text-ink'"
        >
          <component
            :is="windAnimate ? Waves : ArrowUp"
            class="w-3 h-3 lg:w-3.5 lg:h-3.5"
            :stroke-width="2.25"
          />
        </button>
      </div>

      <div class="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 z-[1000]">
        <button
          @click="downloadOfflineMap"
          :disabled="downloadingMap"
          class="cursor-pointer flex items-center justify-center gap-1.5 w-7 h-7 lg:w-auto lg:h-8 lg:px-2.5 rounded-xl t-label-xs bg-white/92 dark:bg-bg-dark/90 backdrop-blur-md border border-brand-petrol-800/15 dark:border-brand-green-800/30 shadow-lg transition-colors duration-200"
          :class="downloadingMap ? 'text-brand-glow-amber' : 'hover:text-ink'"
          :aria-label="downloadProgressText"
          v-tooltip="'Save the map you can see now, so it still works with no signal'"
        >
          <Download v-if="!downloadingMap" class="w-3 h-3 lg:w-3.5 lg:h-3.5" :stroke-width="2.25" />
          <div v-else class="w-3 h-3 lg:w-3.5 lg:h-3.5 border-2 border-brand-glow-amber/25 border-t-brand-glow-amber rounded-full animate-spin"></div>
          <!-- Visible label is dropped wherever the search panel floats on the
               map, because the two would meet. aria-label carries the meaning
               in both cases, so there is no second copy of the text for screen
               readers to announce twice. -->
          <span aria-hidden="true" class="hidden lg:inline">{{ downloadProgressText }}</span>
        </button>
      </div>

      <!-- Map Layer Selector -->
      <!-- Down in the corner with the zoom buttons. It owns the bottom line on
           a phone: the attribution moved one line up rather than fight it for
           the width (see .ol-attribution in main.css). -->
      <div class="absolute bottom-1.5 left-1.5 lg:bottom-2 lg:left-2 z-[1000] flex max-w-[calc(100%-1.5rem)] overflow-x-auto bg-white/92 dark:bg-bg-dark/90 backdrop-blur-md border border-brand-petrol-800/15 dark:border-brand-green-800/30 rounded-md p-0.5 shadow-lg gap-0.5">
        <button
          v-for="style in mapStyles"
          :key="style.id"
          @click="selectMapStyle(style.id)"
          :aria-pressed="currentMapStyleId === style.id"
          class="px-1.5 py-0.5 lg:py-1 rounded-sm t-label-xs text-[9px] lg:text-[11px] transition-colors cursor-pointer"
          :class="currentMapStyleId === style.id
            ? 'bg-brand-petrol-800 text-white dark:bg-brand-glow dark:text-brand-petrol-950'
            : 'hover:text-ink'"
        >
          {{ style.name }}
        </button>
      </div>

      <!-- Attribution. Required by the tile providers, so it is one tap away
           and never hidden - but it is also the longest string on the map, and
           with the weather overlay on it measured 231px beside a 192px basemap
           picker inside a 356px map. It goes where the rest of this app's
           secondary text goes. -->
      <button
        type="button"
        @click="attributionOpen = true"
        aria-label="Attribution"
        v-tooltip="'Who supplies this map and weather data'"
        class="absolute bottom-1.5 right-1.5 lg:bottom-2 lg:right-2 z-[1000] grid place-items-center w-4.5 h-4.5 lg:w-5 lg:h-5 rounded-md bg-white/92 dark:bg-bg-dark/90 backdrop-blur-md border border-brand-petrol-800/15 dark:border-brand-green-800/30 shadow-lg text-ink-faint hover:text-ink transition-colors cursor-pointer"
      >
        <Info class="w-3 h-3 lg:w-3.5 lg:h-3.5" :stroke-width="2.25" />
      </button>

      <!-- What the wind is doing exactly where you asked, interpolated from the
           grid rather than snapped to the nearest arrow.
           Shift-click or long-press only: a plain tap picks a spot, and a
           reading that appeared on every tap covered the map you were reading.
           It stays until closed, because a panel that snatches itself away
           mid-sentence is worse than one you dismiss. -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="windReadout"
          class="absolute z-[1001] -translate-x-1/2 flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md whitespace-nowrap bg-ink text-bg-light dark:text-bg-dark shadow-lg"
          :class="windReadoutBelow ? '' : '-translate-y-full'"
          :style="{
            left: `${windReadout.x}px`,
            top: `${windReadout.y + (windReadoutBelow ? 12 : -8)}px`
          }"
        >
          <span class="font-mono tabular-nums text-[10px] leading-none">{{ windReadout.text }}</span>
          <button
            type="button"
            @click="windReadout = null"
            aria-label="Close the wind reading"
            class="grid place-items-center w-4 h-4 rounded-sm hover:opacity-60 transition-opacity cursor-pointer"
          >
            <X class="w-2.5 h-2.5" :stroke-width="2.75" />
          </button>
        </div>
      </Transition>

      <div
        v-if="locating"
        class="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none"
      >
        <span class="t-label !text-white animate-pulse">
          Acquiring GPS signal...
        </span>
      </div>
    </div>

    <InfoModal v-model:open="attributionOpen" title="Attribution">
      <ul class="flex flex-col gap-3">
        <li v-for="line in attributionLines" :key="line" class="t-body">
          {{ line }}
        </li>
      </ul>
    </InfoModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { Search, Navigation, X, Download, Plus, Minus, Cloud, CloudOff, CloudRain, Wind, Gauge, Thermometer, Info, Waves, ArrowUp } from '@lucide/vue'
import { usePersistedRef, readPersisted } from '../composables/usePersistedRef'
import { useWeatherOverlay, type WeatherLayerId } from '../composables/useWeatherOverlay'
import { useWindField } from '../composables/useWindField'
import { createParticleField, sampleWind } from '../utils/windParticles'
import { createOpenWeatherTileSource } from '../utils/openWeatherMapTiles'
import InfoModal from './InfoModal.vue'
import { usePlaceSearch, reverseGeocodeName } from '../composables/usePlaceSearch'

const props = defineProps<{
  lat: number
  lng: number
  isDark: boolean
  dateStr: string
  /** OpenWeatherMap key. Without it there is no weather overlay to offer. */
  apiKey: string | null
}>()

const emit = defineEmits<{
  (e: 'update:location', lat: number, lng: number): void
  (e: 'update:dateStr', val: string): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
// The template's names are kept, so the markup does not change.
const {
  query: searchQuery,
  results: searchResults,
  showResults,
  onInput: onSearchInput,
  clear: clearSearch
} = usePlaceSearch()
const locating = ref(false)

// OpenLayers instances. Kept outside reactive state: they are large, deeply
// nested objects and Vue's proxy wrapper breaks OL's internal identity checks.
let map: any = null
let markerLayer: any = null
let markerFeature: any = null
let tileLayer: any = null
let weatherLayer: any = null
let windSource: any = null
let particleLayer: any = null
let particleField: ReturnType<typeof createParticleField> | null = null
let particleFrame: number | null = null
let ol: {
  Map: any; View: any; TileLayer: any; VectorLayer: any; VectorSource: any
  XYZ: any; ImageTileSource: any; Feature: any; Point: any; Style: any; Icon: any
  fromLonLat: any; toLonLat: any; transformExtent: any; defaults: any
  Layer: any; applyTransform: any
} | null = null
let resizeObserver: ResizeObserver | null = null

// Tile styles. URL templates use OpenLayers' {x}/{y}/{z} placeholders; {a-d} is
// OL's subdomain syntax, replacing Leaflet's {s}. The service worker matches on
// hostname, so cached tiles keep working across the library change.
// Ordered as they are read: the two that show the ground first, then the two
// that show the map. `mapStyles[0]` is therefore also the default.
// Attributions carry a literal © rather than the `&copy;` entity: the same
// string is now read by a human out of a dialog, not parsed as HTML by
// OpenLayers' attribution control, which this map no longer draws.
const mapStyles = [
  { id: 'satellite', name: 'World', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles © Esri' },
  { id: 'terrain', name: 'Terrain', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' },
  { id: 'dark', name: 'Night', url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', attribution: '© OpenStreetMap © CARTO' },
  { id: 'light', name: 'Day', url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', attribution: '© OpenStreetMap © CARTO' }
]

const WEATHER_ATTRIBUTION = 'Weather © OpenWeatherMap'
const WIND_ATTRIBUTION = 'Wind © Open-Meteo'

// Remembered across reloads. `null` means "never chosen", and that now opens on
// World rather than following the theme: a pilot picks a launch site off the
// ground they will actually see, and the light/dark basemaps answer a question
// about the interface instead.
const savedMapStyleId = usePersistedRef<string | null>('map-style', null)
const currentMapStyleId = ref(mapStyles[0]!.id)

/**
 * Weather overlay.
 *
 * OpenWeatherMap's Weather Maps **1.0** tile service, which the free plan
 * covers (2.0 answers 401 without a paid one). Verified 2026-08-17 against a
 * free key: `clouds_new`, `precipitation_new` and `wind_new` all return PNGs.
 * The provider's useful tile pyramid ends at zoom 10. Above it OpenLayers
 * overzooms that last weather tile while the basemap continues to zoom to 19.
 * Rain keeps `precipitation_new`, but its baked-in alpha is lifted once per
 * downloaded tile; the user's opacity slider is still applied afterward.
 *
 * These tiles are deliberately NOT in the service worker's tile cache. It
 * matches on hostname and lists only the three basemap hosts, so weather goes
 * to the network every time - which is the only correct answer for a picture of
 * where the rain is right now.
 */
const weatherLayerOptions = [
  { id: null, name: 'Off', icon: CloudOff, hint: 'No weather over the map', needsKey: false },
  { id: 'wind', name: 'Wind', icon: Wind, hint: 'Show which way the wind blows, and how hard', needsKey: false },
  { id: 'clouds_new', name: 'Clouds', icon: Cloud, hint: 'Show where the cloud is', needsKey: true },
  { id: 'precipitation_new', name: 'Rain', icon: CloudRain, hint: 'Show where the rain and snow is', needsKey: true },
  { id: 'pressure_new', name: 'Pressure', icon: Gauge, hint: 'Show air pressure, to see a front coming', needsKey: true },
  { id: 'temp_new', name: 'Temperature', icon: Thermometer, hint: 'Show how warm it is', needsKey: true }
] as const

/**
 * Wind comes from Open-Meteo and needs no key, so it is offered even when the
 * OpenWeatherMap ones cannot be. A pilot with no key still gets the one reading
 * that decides whether to launch.
 */
const availableWeatherLayers = computed(() =>
  weatherLayerOptions.filter(layer => !layer.needsKey || !!props.apiKey)
)

const { opacity, restore: restoreOverlay } = useWeatherOverlay()

/**
 * Arrows or moving lines - never both, and remembered.
 *
 * Arrows by default: they are free of an animation loop, and they carry an exact
 * bearing that a streak cannot. One tap trades that for the sense of flow and
 * the speed the motion conveys.
 */
const windAnimate = usePersistedRef<boolean>('wind-animate', false)
const { points: windPoints, grid: windGrid, fetchField: fetchWindField, cancel: cancelWindField } = useWindField()

const weatherLayerId = usePersistedRef<string | null>('weather-layer', null)
const weatherMenuOpen = ref(false)
const topLeftEl = ref<HTMLElement | null>(null)

const activeWeatherLayer = computed(() =>
  weatherLayerOptions.find(l => l.id === weatherLayerId.value) ?? weatherLayerOptions[0]
)

const selectWeatherLayer = (id: string | null) => {
  weatherLayerId.value = id
  weatherMenuOpen.value = false
  applyWeatherLayer()
}

/**
 * The wind arrows.
 *
 * Drawn by the app rather than fetched as tiles: OpenWeatherMap's wind layer
 * carries speed as a colour wash and no direction at all, which is a picture
 * you cannot plan a shot from. Measured on one of its tiles: 74% of the pixels
 * painted, twelve distinct colours, not one arrowhead.
 *
 * Arrows point where the wind BLOWS, not where it comes from. Meteorology
 * reports the latter and aviation reads it that way, but an arrow on a map is
 * read by everyone else as the way the air is going - so the bearing is turned
 * through 180° before it is drawn.
 */
/**
 * Colours are mid-saturation on purpose. A stroked arrow carries no outline to
 * separate it from the ground, so each one has to hold its own against a
 * satellite photograph, a pale terrain map and a near-black night map alike.
 */
const WIND_BANDS = [
  { max: 15, stroke: '#5eb3e4' },
  { max: 25, stroke: '#f5b942' },
  { max: 40, stroke: '#f58a3c' },
  { max: Infinity, stroke: '#f2545b' }
]

// One data URI per band, built once. Sixty-four arrows share four images.
const windArrowCache = new Map<string, string>()

const windArrowSrc = (speed: number) => {
  const band = WIND_BANDS.find(b => speed < b.max) ?? WIND_BANDS[WIND_BANDS.length - 1]!
  const cached = windArrowCache.get(band.stroke)
  if (cached) return cached

  // A shaft and two barbs, stroked, no fill and no outline. Drawn pointing
  // north, so OpenLayers' clockwise rotation IS the bearing.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <path d="M14 24 L14 5 M8.6 11 L14 5 L19.4 11"
      fill="none" stroke="${band.stroke}" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  windArrowCache.set(band.stroke, src)
  return src
}

const windArrowStyle = (feature: any) => {
  if (!ol) return undefined
  const speed = Number(feature.get('speed')) || 0
  const direction = Number(feature.get('direction')) || 0
  return new ol.Style({
    image: new ol.Icon({
      src: windArrowSrc(speed),
      // +180: the reported bearing is where the wind comes FROM.
      rotation: ((direction + 180) * Math.PI) / 180,
      // Size carries speed as well as colour, so the field reads at a glance
      // even for someone who has not learned the colours. A stroked arrow has
      // less visual weight than a filled one, so the range sits higher.
      scale: 0.6 + (Math.min(speed, 45) / 45) * 0.55,
      anchor: [0.5, 0.5]
    })
  })
}

/**
 * The moving field, added above the arrows.
 *
 * OpenLayers only redraws when it thinks something changed, so continuous
 * motion needs its own loop asking for frames. It stops when the layer is off,
 * when the tab is hidden, and when the reader has asked the system for less
 * motion - a wind map is not worth a battery.
 */
const particlesWanted = () => weatherLayerId.value === 'wind' && windAnimate.value

const stopParticleLoop = () => {
  if (particleFrame !== null) {
    cancelAnimationFrame(particleFrame)
    particleFrame = null
  }
}

const startParticleLoop = () => {
  if (particleFrame !== null || !map) return
  const tick = () => {
    particleFrame = null
    if (!map || !particlesWanted() || document.hidden) return
    map.render()
    particleFrame = requestAnimationFrame(tick)
  }
  particleFrame = requestAnimationFrame(tick)
}

const buildParticleLayer = () => {
  if (!ol || !map || particleLayer) return

  particleField = createParticleField({
    getGrid: () => windGrid.value,
    project: (lon, lat, frameState) => {
      const pixel = ol!.applyTransform(
        frameState.coordinateToPixelTransform,
        ol!.fromLonLat([lon, lat]).slice() as number[]
      )
      return [pixel[0]!, pixel[1]!]
    },
    unproject: (x, y, frameState) => {
      const coord = ol!.applyTransform(frameState.pixelToCoordinateTransform, [x, y])
      const lonLat = ol!.toLonLat([coord[0]!, coord[1]!])
      return [lonLat[0]!, lonLat[1]!]
    }
  })

  particleLayer = new ol.Layer({
    zIndex: 6,
    opacity: layerOpacity('wind'),
    render: (frameState: any) => particleField!.render(frameState)
  })
  map.addLayer(particleLayer)
}

const removeParticleLayer = () => {
  stopParticleLoop()
  if (particleLayer && map) map.removeLayer(particleLayer)
  particleLayer = null
  particleField = null
}

// A hidden tab still gets animation frames in some browsers, and a phone in a
// pocket must not be one of them.
const onVisibilityChange = () => {
  if (document.hidden) stopParticleLoop()
  else syncParticles()
}

const syncParticles = () => {
  if (!particlesWanted()) {
    removeParticleLayer()
    return
  }
  buildParticleLayer()
  startParticleLoop()
}

/** Redraw the arrows from whatever the last fetch returned. */
const paintWindField = () => {
  if (!ol || !windSource) return
  windSource.clear()
  windSource.addFeatures(
    windPoints.value.map(p => {
      const feature = new ol!.Feature({ geometry: new ol!.Point(ol!.fromLonLat([p.lon, p.lat])) })
      feature.set('speed', p.speed)
      feature.set('direction', p.direction)
      return feature
    })
  )
}

/** Ask for a grid across whatever the map is showing now. */
const refreshWindField = () => {
  if (!map || !ol || weatherLayerId.value !== 'wind') return
  const [west, south, east, north] = ol.transformExtent(
    map.getView().calculateExtent(map.getSize()),
    'EPSG:3857',
    'EPSG:4326'
  )
  fetchWindField([west, south, east, north])
}

let windRefreshTimer: ReturnType<typeof setTimeout> | null = null

// Debounced: a pinch-zoom fires `moveend` several times, and each one would
// otherwise be a request over somebody's mobile data.
const scheduleWindRefresh = () => {
  if (windRefreshTimer) clearTimeout(windRefreshTimer)
  windRefreshTimer = setTimeout(refreshWindField, 450)
}

const applyWeatherLayer = () => {
  if (!map || !ol) return

  if (weatherLayer) {
    map.removeLayer(weatherLayer)
    weatherLayer = null
    windSource = null
  }
  removeParticleLayer()

  const id = weatherLayerId.value
  if (!id) return

  if (id === 'wind') {
    // Exactly one of the two. Both at once was tried and read as noise: the
    // streaks pass over the arrowheads and neither shape stays legible.
    if (windAnimate.value) {
      syncParticles()
    } else {
      windSource = new ol.VectorSource()
      weatherLayer = new ol.VectorLayer({
        source: windSource,
        style: windArrowStyle,
        // Under the marker, above the basemap - the same place the tile
        // overlays sit, so the opacity slider means the same for both.
        zIndex: 5,
        opacity: layerOpacity(id)
      })
      map.addLayer(weatherLayer)
      paintWindField()
    }
    refreshWindField()
    return
  }

  if (!props.apiKey) return

  const selectedLayer = weatherLayerOptions.find(layer => layer.id === id)
  if (!selectedLayer?.needsKey) return

  weatherLayer = new ol.TileLayer({
    source: createOpenWeatherTileSource(ol.ImageTileSource, {
      layer: selectedLayer.id,
      apiKey: props.apiKey,
      attribution: WEATHER_ATTRIBUTION
    }),
    // Per layer, and the user's to set in the settings drawer: the strength at
    // which rain reads well is not the strength at which cloud does. The marker
    // sits above all of it on zIndex 10.
    opacity: layerOpacity(id),
    zIndex: 5
  })

  map.addLayer(weatherLayer)
}

const layerOpacity = (id: string) => (opacity.value[id as WeatherLayerId] ?? 65) / 100

// A landed fetch is the only thing that changes the arrows.
watch(windPoints, paintWindField)

// Flipping the mode swaps one layer for the other.
watch(windAnimate, applyWeatherLayer)

// Live, so dragging the slider fades the clouds as it moves rather than only
// on the next time the layer happens to be rebuilt.
watch(opacity, () => {
  const id = weatherLayerId.value
  if (!id) return
  weatherLayer?.setOpacity(layerOpacity(id))
  particleLayer?.setOpacity(layerOpacity(id))
}, { deep: true })

/**
 * `null` unless the reader has just tapped the wind field.
 *
 * It remembers the lon/lat it was taken at, not the pixel it was drawn at.
 * Tapping the map also recentres it on the tap, so a pixel recorded before that
 * move points at different ground once the move lands; `positionWindReadout`
 * recomputes the pixel from the coordinate whenever the view settles.
 */
const windReadout = ref<{ lon: number; lat: number; x: number; y: number; text: string } | null>(null)

/** Above the point normally, below it when the point is near the top edge. */
const windReadoutBelow = computed(() => (windReadout.value?.y ?? 100) < 44)

const positionWindReadout = () => {
  const readout = windReadout.value
  if (!readout || !map || !ol) return
  const pixel = map.getPixelFromCoordinate(ol.fromLonLat([readout.lon, readout.lat]))
  if (!pixel) return
  windReadout.value = { ...readout, x: pixel[0], y: pixel[1] }
}

const LONG_PRESS_MS = 450

let skipNextRecenter = false
let suppressNextMapClick = false
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pressStart: { x: number; y: number } | null = null

const clearPress = () => {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
  pressStart = null
}

const onMapPointerDown = (event: PointerEvent) => {
  if (!map || event.isPrimary === false) return
  clearPress()
  pressStart = { x: event.clientX, y: event.clientY }
  pressTimer = setTimeout(() => {
    pressTimer = null
    if (!map || !ol) return
    const coordinate = map.getEventCoordinate(event)
    if (!coordinate) return
    const [lon, lat] = ol.toLonLat(coordinate)
    suppressNextMapClick = true
    showWindReadout(lon!, lat!)
  }, LONG_PRESS_MS)
}

const onMapPointerMove = (event: PointerEvent) => {
  if (!pressStart) return
  const moved = Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y)
  if (moved > 10) clearPress()
}

const onMapPointerEnd = () => clearPress()

/**
 * Only over the wind layer, and only there: everywhere else in the app the
 * browser's own menu is the right answer.
 */
const onMapContextMenu = (event: MouseEvent) => {
  if (weatherLayerId.value !== 'wind') return
  event.preventDefault()
}

const showWindReadout = (lon: number, lat: number) => {
  const grid = windGrid.value
  if (!grid || weatherLayerId.value !== 'wind') return

  const { speed } = sampleWind(grid, lon, lat)
  // The gust is not interpolated: it belongs to the nearest reading, and
  // averaging two gusts would invent a number nobody measured.
  const nearest = windPoints.value.reduce((best, point) => {
    const d = (point.lat - lat) ** 2 + (point.lon - lon) ** 2
    return d < best.d ? { d, point } : best
  }, { d: Infinity, point: null as null | typeof windPoints.value[number] })

  const gust = nearest.point ? Math.round(nearest.point.gust) : Math.round(speed)
  windReadout.value = { lon, lat, x: 0, y: 0, text: `${Math.round(speed)} km/h · gust ${gust}` }
  positionWindReadout()
}

/**
 * Where the map was looking, so a reload does not throw the view away.
 *
 * The marker's position was already remembered; the VIEW was not, so every
 * reload snapped back to the marker at zoom 12 and lost wherever you had panned
 * to. Written on `moveend`, read once when the map is built.
 *
 * `readPersisted` for the initial read rather than this ref's own value:
 * `usePersistedRef` restores on mount, and the map is built inside an async
 * mount hook. Reading the store directly removes any question of which of the
 * two happens first.
 */
interface SavedView { lon: number; lat: number; zoom: number }
const savedView = usePersistedRef<SavedView | null>('map-view', null)

/** Shown between the zoom buttons, so the scale is never a mystery. */
const currentZoom = ref(12)

const rememberView = () => {
  if (!map || !ol) return
  const view = map.getView()
  const centre = ol.toLonLat(view.getCenter())
  const zoom = view.getZoom()
  if (!Number.isFinite(zoom)) return
  currentZoom.value = Math.round(zoom)
  savedView.value = { lon: centre[0], lat: centre[1], zoom }
}

const attributionOpen = ref(false)

/** Whoever is drawing this map right now, basemap first. */
const attributionLines = computed(() => {
  const basemap = mapStyles.find(s => s.id === currentMapStyleId.value) ?? mapStyles[0]!
  const lines = [basemap.attribution]
  if (weatherLayerId.value === 'wind') lines.push(WIND_ATTRIBUTION)
  else if (weatherLayerId.value && props.apiKey) lines.push(WEATHER_ATTRIBUTION)
  return lines
})

const downloadingMap = ref(false)
const downloadProgress = ref(0)
const downloadProgressText = ref('Save Offline Map')

// Convert coordinates to Slippy map tile index
const lon2tile = (lon: number, zoom: number) => {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom))
}

const lat2tile = (lat: number, zoom: number) => {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
}

const downloadOfflineMap = async () => {
  if (!map || !ol || downloadingMap.value) return

  downloadingMap.value = true
  downloadProgress.value = 0
  downloadProgressText.value = 'Saving...'

  try {
    const view = map.getView()
    // OpenLayers works in Web Mercator internally; convert the visible extent
    // back to lon/lat before turning it into tile indices.
    const extent = ol.transformExtent(
      view.calculateExtent(map.getSize()),
      'EPSG:3857',
      'EPSG:4326'
    )
    const [west, south, east, north] = extent
    const [centerLng, centerLat] = ol.toLonLat(view.getCenter())
    const currentStyle = mapStyles.find(s => s.id === currentMapStyleId.value) || mapStyles[0]

    // Download tiles for current viewport at: current zoom, 1 zoom level out, and 2 zoom levels in
    const currentZoom = Math.round(view.getZoom())
    const zoomLevels = [currentZoom - 1, currentZoom, currentZoom + 1, currentZoom + 2].filter(z => z >= 8 && z <= 18)

    const tileUrls: string[] = []

    for (const z of zoomLevels) {
      const xMin = lon2tile(west, z)
      const xMax = lon2tile(east, z)
      const yMin = lat2tile(north, z)
      const yMax = lat2tile(south, z)

      const centerTileX = lon2tile(centerLng, z)
      const centerTileY = lat2tile(centerLat, z)

      // Cap grid boundaries to a local radius so downloads remain quick
      const xStart = Math.max(xMin, centerTileX - 3)
      const xEnd = Math.min(xMax, centerTileX + 3)
      const yStart = Math.max(yMin, centerTileY - 3)
      const yEnd = Math.min(yMax, centerTileY + 3)

      for (let x = xStart; x <= xEnd; x++) {
        for (let y = yStart; y <= yEnd; y++) {
          const subdomains = ['a', 'b', 'c', 'd']
          const s = subdomains[Math.abs(x + y) % subdomains.length]
          const url = currentStyle.url
            .replace('{a-d}', s)
            .replace('{z}', String(z))
            .replace('{x}', String(x))
            .replace('{y}', String(y))

          if (!tileUrls.includes(url)) {
            tileUrls.push(url)
          }
        }
      }
    }

    // Safe threshold to prevent download overloading
    const activeUrls = tileUrls.slice(0, 150)
    if (activeUrls.length === 0) {
      downloadProgressText.value = 'No tiles'
      setTimeout(() => { downloadProgressText.value = 'Save Offline Map' }, 2000)
      downloadingMap.value = false
      return
    }

    let downloadedCount = 0
    const batchSize = 6
    
    for (let i = 0; i < activeUrls.length; i += batchSize) {
      const batch = activeUrls.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (url) => {
          try {
            // Trigger fetch (Service Worker intercepts and caches this tile URL)
            const response = await fetch(url, { cache: 'reload' })
            if (response.ok) {
              // Successfully cached
            }
          } catch (e) {
            console.warn('[Offline Map] Tile caching failed:', url, e)
          } finally {
            downloadedCount++
            downloadProgress.value = Math.round((downloadedCount / activeUrls.length) * 100)
            downloadProgressText.value = `Saving... ${downloadProgress.value}%`
          }
        })
      )
    }

    downloadProgressText.value = 'Saved Offline!'
    setTimeout(() => {
      downloadProgressText.value = 'Save Offline Map'
    }, 4000)

  } catch (err) {
    console.error('[Offline Map] Save error', err)
    downloadProgressText.value = 'Error Saving'
    setTimeout(() => { downloadProgressText.value = 'Save Offline Map' }, 3000)
  } finally {
    downloadingMap.value = false
  }
}

const selectMapStyle = (styleId: string) => {
  currentMapStyleId.value = styleId
  savedMapStyleId.value = styleId

  const selected = mapStyles.find(s => s.id === styleId)
  if (selected && tileLayer && ol) {
    // Swapping the source (rather than the URL) also swaps the attribution,
    // which OpenLayers renders from the source itself.
    tileLayer.setSource(new ol.XYZ({
      url: selected.url,
      attributions: selected.attribution,
      maxZoom: 19,
      crossOrigin: 'anonymous'
    }))
  }
}

// Marker style: a filled dot with a contrasting ring, drawn as SVG so it can
// follow the theme. OpenLayers has no HTML markers, unlike Leaflet's divIcon.
const buildMarkerStyle = () => {
  if (!ol) return null
  const fill = props.isDark ? '#8fb6d6' : '#224245'
  const ring = props.isDark ? '#0d1620' : '#ffffff'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13" fill="${fill}" opacity="0.22"/>
    <circle cx="16" cy="16" r="8" fill="${ring}"/>
    <circle cx="16" cy="16" r="6" fill="${fill}"/>
  </svg>`
  return new ol.Style({
    image: new ol.Icon({
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      anchor: [0.5, 0.5],
      scale: 1
    })
  })
}

const applyMarkerStyle = () => {
  const style = buildMarkerStyle()
  if (style && markerLayer) markerLayer.setStyle(style)
}

onMounted(async () => {
  if (process.client) {
    try {
      // Dynamically import OpenLayers on the client. Imported piecemeal so the
      // bundle only carries the classes actually used.
      const [
        { default: Map }, { default: View }, { default: TileLayer },
        { default: VectorLayer }, { default: VectorSource }, { default: XYZ },
        { default: ImageTileSource },
        { default: Feature }, { default: Point },
        { Style, Icon }, { fromLonLat, toLonLat, transformExtent },
        { defaults: defaultControls },
        { default: BaseLayer }, { apply: applyTransform }
      ] = await Promise.all([
        import('ol/Map'), import('ol/View'), import('ol/layer/Tile'),
        import('ol/layer/Vector'), import('ol/source/Vector'), import('ol/source/XYZ'),
        import('ol/source/ImageTile'),
        import('ol/Feature'), import('ol/geom/Point'),
        import('ol/style'), import('ol/proj'),
        import('ol/control'),
        import('ol/layer/Layer'), import('ol/transform')
      ])

      ol = {
        Map, View, TileLayer, VectorLayer, VectorSource, XYZ, ImageTileSource, Feature, Point,
        Style, Icon, fromLonLat, toLonLat, transformExtent,
        defaults: defaultControls,
        Layer: BaseLayer, applyTransform
      }

      if (!mapContainer.value) return

      // A remembered basemap wins; otherwise World.
      currentMapStyleId.value = savedMapStyleId.value ?? mapStyles[0]!.id
      const initialStyle = mapStyles.find(s => s.id === currentMapStyleId.value) || mapStyles[0]!

      tileLayer = new TileLayer({
        source: new XYZ({
          url: initialStyle.url,
          attributions: initialStyle.attribution,
          maxZoom: 19,
          crossOrigin: 'anonymous'
        })
      })

      markerFeature = new Feature({
        geometry: new Point(fromLonLat([props.lng, props.lat]))
      })

      markerLayer = new VectorLayer({
        source: new VectorSource({ features: [markerFeature] }),
        // Above the weather overlay, which sits at 5. The spot you picked must
        // never be hidden by the rain drawn over it.
        zIndex: 10
      })

      // A remembered view wins over the marker: panning away from the marker
      // is a deliberate act, and a reload should not undo it.
      const restored = readPersisted<SavedView | null>('map-view', null)
      const initialCentre = restored
        ? fromLonLat([restored.lon, restored.lat])
        : fromLonLat([props.lng, props.lat])
      const initialZoom = restored?.zoom ?? 12
      currentZoom.value = Math.round(initialZoom)

      map = new Map({
        target: mapContainer.value,
        layers: [tileLayer, markerLayer],
        view: new View({
          center: initialCentre,
          zoom: initialZoom,
          maxZoom: 19
        }),
        // The app draws all of its own map chrome, including the attribution,
        // which is a button and a dialog here rather than a strip of type
        // across the bottom of a phone-sized map.
        controls: defaultControls({ zoom: false, rotate: false, attribution: false })
      })

      applyMarkerStyle()
      restoreOverlay()
      applyWeatherLayer()

      map.on('click', (e: any) => {
        // A long press already answered this tap with a reading; it must not
        // also drop the marker somewhere the reader was only asking about.
        if (suppressNextMapClick) {
          suppressNextMapClick = false
          return
        }

        const [lng, lat] = toLonLat(e.coordinate)

        // Shift-click asks what the wind is doing here. It does not pick a spot.
        if (e.originalEvent?.shiftKey) {
          showWindReadout(lng!, lat!)
          return
        }

        // Picking a spot leaves the map exactly where it is. Recentring on the
        // point you just tapped moves the ground out from under your finger,
        // which makes a second tap land somewhere you did not choose.
        skipNextRecenter = true
        emit('update:location', lat, lng)
      })

      // Long press is the touch equivalent of shift-click. A finger that moves
      // is panning the map, so the press is abandoned.
      const container = mapContainer.value
      if (container) {
        // Passive: none of these ever calls preventDefault, and saying so keeps
        // them out of the browser's way on a scrolling, pinching touch surface.
        container.addEventListener('pointerdown', onMapPointerDown, { passive: true })
        container.addEventListener('pointerup', onMapPointerEnd, { passive: true })
        container.addEventListener('pointercancel', onMapPointerEnd, { passive: true })
        container.addEventListener('lostpointercapture', onMapPointerEnd, { passive: true })
        container.addEventListener('pointermove', onMapPointerMove, { passive: true })
        // This one must be able to cancel, so it cannot be passive.
        container.addEventListener('contextmenu', onMapContextMenu)
      }

      map.on('pointermove', (e: any) => {
        map.getTargetElement().style.cursor = e.dragging ? 'grabbing' : 'crosshair'
      })

      // The arrow field describes the extent it was fetched for, so it has to
      // follow the map rather than the marker.
      map.on('moveend', () => {
        rememberView()
        positionWindReadout()
        scheduleWindRefresh()
      })

      document.addEventListener('visibilitychange', onVisibilityChange)

      // Force a re-measure once the flex layout has settled.
      setTimeout(() => {
        if (map) map.updateSize()
      }, 200)

      // Keep the canvas correct when the panel resizes (orientation change,
      // desktop window drag). OL does not observe its own container.
      if (typeof ResizeObserver !== 'undefined' && mapContainer.value) {
        resizeObserver = new ResizeObserver(() => {
          if (map) map.updateSize()
        })
        resizeObserver.observe(mapContainer.value)
      }

      // Initialize with reverse geocoding on startup
      if (!searchQuery.value) {
        reverseGeocode(props.lat, props.lng)
      }

    } catch (err) {
      console.error('Failed to initialize OpenLayers map', err)
    }
  }
})

let skipNextReverseGeocode = false

// Reverse geocoding function to update the search input query with the location name
const reverseGeocode = async (latitude: number, longitude: number) => {
  const name = await reverseGeocodeName(latitude, longitude)
  if (name !== null) searchQuery.value = name
}

// Watch coordinates to update map position (e.g. from GPS or search)
watch([() => props.lat, () => props.lng], ([newLat, newLng]) => {
  // Read and clear before the early exit below. Left set, the flag would be
  // spent on whatever changed the location NEXT - a search result that then
  // silently refused to move the map.
  const cameFromTheMap = skipNextRecenter
  skipNextRecenter = false

  if (map && markerFeature && ol) {
    const target = ol.fromLonLat([newLng, newLat])
    const current = markerFeature.getGeometry().getCoordinates()
    if (current[0] !== target[0] || current[1] !== target[1]) {
      markerFeature.getGeometry().setCoordinates(target)
      // Recentre only when the location came from somewhere OTHER than the map:
      // a search result, the GPS button, or a remembered position. A spot you
      // tapped is already on screen, and moving the map to it is a jolt that
      // shifts the ground out from under the next tap.
      if (!cameFromTheMap) map.getView().setCenter(target)
    }
  }
  if (skipNextReverseGeocode) {
    skipNextReverseGeocode = false
  } else {
    reverseGeocode(newLat, newLng)
  }
})

// The basemap no longer follows the theme - the default is World at every
// theme, and anything else is the user's own choice. The marker still has to
// be redrawn, because it is an SVG built from the theme's colours.
watch(() => props.isDark, () => {
  applyMarkerStyle()
})

// The key can arrive after the map does - it is typed into the settings drawer
// while this component is on screen - and the tile URL carries it.
watch(() => props.apiKey, () => {
  if (!props.apiKey) weatherMenuOpen.value = false
  applyWeatherLayer()
})

const selectResult = (result: any) => {
  const latitude = parseFloat(result.lat)
  const longitude = parseFloat(result.lon)

  skipNextReverseGeocode = true
  emit('update:location', latitude, longitude)

  // Center map on result
  if (map && ol) {
    map.getView().animate({
      center: ol.fromLonLat([longitude, latitude]),
      zoom: 13,
      duration: 350
    })
  }

  // Update search query bar display
  searchQuery.value = result.display_name
  showResults.value = false
}

// Locate me via browser geolocation
const locateMe = () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser')
    return
  }

  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      emit('update:location', latitude, longitude)
      if (map && ol) {
        map.getView().animate({
          center: ol.fromLonLat([longitude, latitude]),
          zoom: 14,
          duration: 350
        })
      }
      locating.value = false
    },
    (err) => {
      console.warn('Geolocation error', err)
      alert('Unable to retrieve your location. Check browser location permissions.')
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

// Close the search dropdown and the weather menu on a click outside them.
const closeSearch = (e: MouseEvent) => {
  const el = e.target as HTMLElement
  if (!el.closest('.relative')) {
    showResults.value = false
  }
  if (weatherMenuOpen.value && !topLeftEl.value?.contains(el)) {
    weatherMenuOpen.value = false
  }
}

onMounted(() => {
  if (process.client) {
    document.addEventListener('click', closeSearch)
  }
})

onUnmounted(() => {
  if (process.client) {
    document.removeEventListener('click', closeSearch)
  }
  if (windRefreshTimer) clearTimeout(windRefreshTimer)
  cancelWindField()
  clearPress()
  const container = mapContainer.value
  if (container) {
    container.removeEventListener('pointerdown', onMapPointerDown)
    container.removeEventListener('pointerup', onMapPointerEnd)
    container.removeEventListener('pointercancel', onMapPointerEnd)
    container.removeEventListener('lostpointercapture', onMapPointerEnd)
    container.removeEventListener('pointermove', onMapPointerMove)
    container.removeEventListener('contextmenu', onMapContextMenu)
  }
  removeParticleLayer()
  if (import.meta.client) document.removeEventListener('visibilitychange', onVisibilityChange)
  resizeObserver?.disconnect()
  resizeObserver = null
  // OpenLayers keeps listeners on the target element until it is released.
  map?.setTarget(undefined)
  map = null
})

// Zoom controls are drawn by the app rather than by OpenLayers, so they can
// match the rest of the map chrome and reach a 44px tap target.
const zoomBy = (delta: number) => {
  if (!map) return
  const view = map.getView()
  view.animate({ zoom: (view.getZoom() ?? 12) + delta, duration: 200 })
}
</script>

<style scoped>
/* Scoped styles */
</style>
