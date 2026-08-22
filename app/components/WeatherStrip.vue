<template>
  <!-- Nothing at all without a key or without data. An empty row of dashes
       would take the same space and tell you less than the absence does. -->
  <button
    v-if="weather"
    type="button"
    @click="open = true"
    aria-label="Weather conditions"
    v-tooltip="'Open the full weather report'"
    class="flex items-baseline gap-2 t-num-xs text-[10px] lg:text-[11px] text-ink whitespace-nowrap hover:text-brand-glow-cyan transition-colors cursor-pointer"
  >
    <span class="flex items-center gap-1">
      <Cloud class="w-2.5 h-2.5 shrink-0 self-center" :stroke-width="2.25" />{{ Math.round(weather.clouds) }}%
    </span>

    <!-- Rain only when there IS rain. Zero millimetres is the normal case, and
         printing it every day would cost the width that the wind reading needs
         on the day it matters. -->
    <span v-if="weather.rain > 0" class="flex items-center gap-1 text-brand-glow-cyan">
      <Droplet class="w-2.5 h-2.5 shrink-0 self-center" :stroke-width="2.25" />{{ weather.rain.toFixed(1) }}
    </span>

    <!-- Wind and gust share one icon and read as a range: they are the same
         measurement, steady and peak, and two icons would cost the width that
         put the gust out of reach in the first place.

         The whole pair is the first thing dropped when the line runs out of
         room, and the line only runs out when it is raining - which is the
         moment the rain reading has earned that space. -->
    <span
      class="items-center gap-1"
      :class="weather.rain > 0 ? 'hidden xs:flex' : 'flex'"
    >
      <Wind class="w-2.5 h-2.5 shrink-0 self-center" :stroke-width="2.25" />{{ windLabel }}
    </span>
  </button>

  <InfoModal v-model:open="open" title="Weather conditions">
    <WeatherWidget
      bare
      :weather="weather"
      :loading="loading"
      :error="error"
      :hasKey="hasKey"
      :airQuality="airQuality"
    />
  </InfoModal>
</template>

<script setup lang="ts">
/**
 * The weather in one line, on the map, with the detail one tap behind it.
 *
 * The full panel is 220px tall and the solar page has to fit a phone screen, so
 * the panel moved into a dialog and this took its place on the line that
 * already says where you are. Cloud cover and rain lead, because this tool is
 * as much for photographers as for drone pilots and what the sky is doing
 * outranks how hard the wind blows.
 *
 * The picture of that weather is the map overlay in `LocationPicker`; these are
 * the numbers for the one spot the marker is on.
 */
import { ref, computed } from 'vue'
import { Cloud, Droplet, Wind } from '@lucide/vue'
import InfoModal from './InfoModal.vue'
import WeatherWidget from './WeatherWidget.vue'
import type { WeatherData, AirQuality } from '../composables/useWeather'

const props = defineProps<{
  weather: WeatherData | null
  loading: boolean
  error: string | null
  hasKey: boolean
  airQuality?: AirQuality | null
}>()

const open = ref(false)

/**
 * "9" on a steady day, "9-17" when it gusts.
 *
 * The range collapses to one number when the two are equal, which is the
 * common case rather than an edge one: OpenWeatherMap omits `wind.gust`
 * entirely on calm days, and `useWeather` falls back to the steady speed, so a
 * naive range would print "9-9" most of the year and teach the reader to stop
 * looking at it.
 */
const windLabel = computed(() => {
  const w = props.weather
  if (!w) return ''
  const steady = Math.round(w.windSpeed)
  const peak = Math.round(w.windGust)
  return peak > steady ? `${steady}–${peak}` : `${steady}`
})
</script>
