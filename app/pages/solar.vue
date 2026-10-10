<template>
  <!-- One flex column on a phone, two columns from lg. `h-0 grow` on every size,
       not just lg: a zero basis makes this take exactly the space the shell has
       left, which is what `fitViewport` promises. -->
  <main class="flex flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-12 lg:gap-6 items-stretch grow min-h-0 h-0">

    <!-- The reading column.

         `contents` on a phone dissolves this wrapper, so its three children
         become rows of the page itself and the map can sit between them - the
         order a pilot works in: what is the day doing, where am I, what is the
         light doing now. From lg it is a real scrolling column again and the
         map returns to its left/right arrangement. -->
    <div class="contents lg:order-2 lg:col-span-5 lg:flex lg:flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-1 lg:gap-4">
      <div class="order-1 shrink-0 animate-panel">
        <ClientOnly>
          <DaySchedule :lat="lat" :lng="lng" :date="selectedDate" />
        </ClientOnly>
      </div>

      <div class="order-3 shrink-0 animate-panel">
        <ClientOnly>
          <LightState :lat="lat" :lng="lng" :date="selectedDate" />
        </ClientOnly>
      </div>

      <!-- Weather is hidden on a phone for now, not removed: the four blocks
           above are what the tool is opened for, and they have to fit. -->
      <div class="order-4 hidden lg:flex grow shrink-0 flex-col min-h-0 animate-panel">
        <ClientOnly>
          <WeatherWidget
            :weather="activeWeather"
            :loading="weatherLoading"
            :error="weatherError"
            :hasKey="!!apiKey"
            :airQuality="airQuality"
          />
        </ClientOnly>
      </div>
    </div>

    <!-- Location map. Takes whatever height the fixed rows leave it. -->
    <div class="order-2 lg:order-1 lg:col-span-7 flex flex-col grow min-h-0 lg:h-full animate-panel">
      <ClientOnly>
        <LocationPicker
          v-model:dateStr="dateStr"
          :lat="lat"
          :lng="lng"
          :isDark="isDark"
          :apiKey="apiKey"
          @update:location="onLocationUpdated"
        >
          <!-- The weather summary rides on the coordinates line, so it costs no
               height on a screen that has none left to give. -->
          <template #meta>
            <WeatherStrip
              :weather="activeWeather"
              :loading="weatherLoading"
              :error="weatherError"
              :hasKey="!!apiKey"
              :airQuality="airQuality"
            />
          </template>
        </LocationPicker>
      </ClientOnly>
    </div>
  </main>
</template>

<script setup lang="ts">
/**
 * The solar planner.
 *
 * Owns location, date and weather. These used to live in app.vue when one
 * component held every tool; they belong to this tool alone, so they moved here
 * with it. Only the resolved theme and the API key are shared, through their own
 * composables, because the layout needs them too.
 */
import { ref, computed, watch, onMounted } from 'vue'
import DaySchedule from '../components/DaySchedule.vue'
import LightState from '../components/LightState.vue'
import WeatherWidget from '../components/WeatherWidget.vue'
import WeatherStrip from '../components/WeatherStrip.vue'
import LocationPicker from '../components/LocationPicker.vue'
import { useWeather } from '../composables/useWeather'
import { useTheme } from '../composables/useTheme'
import { usePersistedRef, readPersisted } from '../composables/usePersistedRef'
import { toLocalDateString } from '../utils/localDate'

// This tool now fits one screen at every size, so the shell may cap its own
// height and keep the footer on the bottom edge instead of below the fold.
definePageMeta({ fitViewport: true })

useHead({ title: 'Solar Planner // LightKit' })

const { isDark } = useTheme()

// The date always opens on today; a remembered date would be stale by morning.
// Today on the reader's own calendar, not in UTC (see toLocalDateString).
const dateStr = ref(toLocalDateString(new Date()))

// Location is remembered, because picking a spot on the map is a real choice.
// Default is Reykjavik, Iceland until the browser or the user says otherwise.
const lat = usePersistedRef('lat', 64.1466)
const lng = usePersistedRef('lng', -21.9426)
const hasStoredLocation = readPersisted<number | null>('lat', null) !== null

// Noon, so a timezone shift cannot move the reading to the previous day.
const selectedDate = computed(() => {
  if (!dateStr.value) return new Date()
  return new Date(`${dateStr.value}T12:00:00`)
})

const weather = useWeather()
const apiKey = computed(() => weather.apiKey.value)
const weatherLoading = computed(() => weather.loading.value)
const weatherError = computed(() => weather.error.value)
const airQuality = computed(() => weather.airQuality.value)
const activeWeather = computed(() => weather.getWeatherForDateTime(selectedDate.value))

const onLocationUpdated = (newLat: number, newLng: number) => {
  lat.value = newLat
  lng.value = newLng
}

const triggerWeatherFetch = () => {
  if (apiKey.value) weather.fetchWeather(lat.value, lng.value)
}

watch([lat, lng, apiKey], triggerWeatherFetch)

/** Last resort when the browser will not give coordinates. */
const fallbackToIpGeolocation = async () => {
  for (const url of ['https://ipapi.co/json/', 'https://freeipapi.com/api/json']) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      const data = await response.json()
      if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
        lat.value = data.latitude
        lng.value = data.longitude
        return
      }
    } catch (err) {
      console.warn('[Location Startup] IP geolocation failed:', url, err)
    }
  }
}

onMounted(() => {
  triggerWeatherFetch()

  // A remembered location is a deliberate choice; overwriting it would be rude.
  if (hasStoredLocation) return

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        lat.value = position.coords.latitude
        lng.value = position.coords.longitude
      },
      () => fallbackToIpGeolocation(),
      { enableHighAccuracy: false, timeout: 3000 }
    )
  } else {
    fallbackToIpGeolocation()
  }
})
</script>
