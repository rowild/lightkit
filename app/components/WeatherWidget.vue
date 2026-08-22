<template>
  <div
    class="flex flex-col justify-between"
    :class="bare
      ? ''
      : 'glass-panel p-4 sm:p-6 rounded-2xl shadow-sm h-full min-h-[220px]'"
  >

    <!-- State 1: No API key -->
    <div v-if="!hasKey" class="flex flex-col items-center justify-center text-center py-6 gap-3 h-full">
      <CloudOff class="text-ink-faint" :size="32" :stroke-width="1.25" />
      <h5 class="t-title">
        Weather deactivated
      </h5>
      <p class="t-body-sm max-w-xs">
        Add your OpenWeatherMap API key in settings to see live wind, gusts, cloud cover, humidity, precipitation, pressure and a flight safety rating.
      </p>
    </div>

    <!-- State 2: Loading -->
    <div v-else-if="loading" class="flex flex-col justify-center items-center py-10 gap-3 h-full">
      <div class="w-6 h-6 border-2 border-brand-petrol-800/25 dark:border-brand-green-500/25 border-t-brand-petrol-800 dark:border-t-brand-glow rounded-full animate-spin"></div>
      <span class="t-label">
        Refreshing weather data...
      </span>
    </div>

    <!-- State 3: Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center text-center py-6 gap-2 h-full">
      <AlertTriangle class="text-red-600 dark:text-red-400" :size="24" :stroke-width="1.75" />
      <span class="t-title text-red-700 dark:text-red-400">Weather query failed</span>
      <p class="t-body-sm max-w-xs">
        {{ error }}
      </p>
    </div>

    <!-- State 4: Weather display -->
    <div v-else-if="weather" class="flex flex-col gap-5 h-full justify-between">
      <!-- Header. Temperature and description stack under the heading on a
           phone; the safety verdict gets its own full-width row so a long
           sentence can never collide with the temperature. -->
      <div class="border-b border-brand-petrol-800/10 dark:border-brand-green-800/20 pb-4 flex flex-col gap-3">
        <!-- In a dialog the title bar already says "Weather conditions", so the
             heading would be the same words twice, 40px apart. -->
        <div :class="bare ? 'flex justify-end' : 'row-kv'">
          <h4 v-if="!bare" class="t-label">Weather conditions</h4>
          <span class="flex items-baseline gap-1.5">
            <span class="font-mono text-2xl font-light text-ink tabular-nums">{{ Math.round(weather.temp) }}&deg;C</span>
          </span>
        </div>

        <p class="t-body-sm capitalize -mt-1">{{ weather.description }}</p>

        <!-- Rating indicator -->
        <div class="flex items-center gap-2" :class="safetyTextColor">
          <component :is="safetyIcon" :size="18" :stroke-width="2" class="shrink-0" />
          <span class="font-display text-base font-semibold tracking-wide">{{ safetyText }}</span>
        </div>
      </div>

      <!-- Metrics. The label column used to be a hard 120px, which left almost
           no room for the value at phone widths. It is now flexible and the
           value is baseline-aligned and unbreakable. -->
      <div class="flex flex-col gap-3 py-1">
        <div v-for="metric in metrics" :key="metric.label" class="flex items-center gap-3">
          <div class="rounded-xl bg-brand-petrol-800/8 dark:bg-brand-green-800/45 border border-brand-petrol-800/10 dark:border-brand-green-800/30 grid place-items-center w-9 h-9 flex-shrink-0">
            <component
              :is="metric.icon"
              class="text-brand-petrol-700 dark:text-brand-glow"
              :style="metric.iconStyle"
              :size="15"
              :stroke-width="1.75"
            />
          </div>
          <div class="row-kv flex-grow min-w-0">
            <span class="t-label">{{ metric.label }}</span>
            <span class="flex items-baseline gap-1">
              <span class="t-num" :class="metric.valueClass">{{ metric.value }}</span>
              <span class="t-label-xs" :class="metric.unitClass">{{ metric.unit }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Explanatory recommendation caption -->
      <p class="t-body-sm bg-brand-petrol-800/6 dark:bg-brand-green-800/40 p-3.5 rounded-xl border border-brand-petrol-800/10 dark:border-brand-green-800/30">
        {{ weather.flyabilityReason }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CloudOff, AlertTriangle, Wind, Zap, Cloud, CloudRain, Snowflake, Navigation, ShieldCheck, ShieldAlert, Shield, Eye, CloudFog, Waves, Droplets, Gauge, Clock3 } from '@lucide/vue'
import type { WeatherData, AirQuality } from '../composables/useWeather'
import { describePrecipitation } from '../utils/weatherPrecipitation'
import {
  describePressureTrend,
  describeWeatherReportTime
} from '../utils/weatherReport'

const props = defineProps<{
  weather: WeatherData | null
  loading: boolean
  error: string | null
  hasKey: boolean
  /** Optional: absent when the air-quality request failed or has not landed. */
  airQuality?: AirQuality | null
  /**
   * Drop the card chrome. Set when this renders inside a dialog, which already
   * supplies the surface, the padding and a height it manages itself - a panel
   * inside a panel reads as a mistake, and `min-h` inside a scrolling dialog
   * body fights the dialog for the screen.
   */
  bare?: boolean
}>()

const now = useNow(60_000)

// One description of the readouts, rather than several near-identical
// blocks of markup that each had to be corrected separately.
const metrics = computed(() => {
  const w = props.weather
  if (!w) return []
  const precipitation = describePrecipitation(w.precipitation)
  const pressureTrend = w.pressureTrend ? describePressureTrend(w.pressureTrend) : null
  const reportTime = describeWeatherReportTime(
    w.reportTime,
    Math.floor(now.value.getTime() / 1000)
  )
  return [
    {
      label: 'Wind speed',
      icon: Wind,
      value: Math.round(w.windSpeed),
      unit: 'km/h',
      valueClass: '',
      unitClass: '',
      iconStyle: undefined
    },
    {
      label: 'Gust limit',
      icon: Zap,
      value: Math.round(w.windGust),
      unit: 'km/h',
      // 20 km/h is where most consumer drones start to struggle.
      valueClass: w.windGust >= 20 ? 'text-brand-glow-amber' : '',
      unitClass: '',
      iconStyle: undefined
    },
    {
      label: 'Cloud cover',
      icon: Cloud,
      value: w.clouds,
      unit: '%',
      valueClass: '',
      unitClass: '',
      iconStyle: undefined
    },
    {
      label: 'Humidity',
      icon: Droplets,
      value: Math.round(w.humidity),
      unit: '%',
      valueClass: '',
      unitClass: '',
      iconStyle: undefined
    },
    {
      label: 'Precipitation',
      icon: precipitation.kind === 'snow' ? Snowflake : CloudRain,
      value: precipitation.label,
      unit: precipitation.detail,
      valueClass: precipitation.kind === 'none' ? '' : 'text-brand-glow-cyan',
      unitClass: 'normal-case',
      iconStyle: undefined
    },
    ...(w.pressureHpa === null
      ? []
      : [{
          label: 'Pressure',
          icon: Gauge,
          value: Math.round(w.pressureHpa),
          unit: pressureTrend ? `hPa · ${pressureTrend}` : 'hPa',
          valueClass: w.pressureTrend?.direction === 'falling'
            ? 'text-brand-glow-amber'
            : '',
          // hPa is case-sensitive; the label role normally uppercases units.
          unitClass: 'normal-case',
          iconStyle: undefined
        }]),
    {
      label: 'Wind heading',
      icon: Navigation,
      value: `${w.windDeg}°`,
      unit: getCompassDirection(w.windDeg),
      valueClass: '',
      unitClass: '',
      iconStyle: { transform: `rotate(${w.windDeg}deg)` }
    },
    {
      // How far you can see. 10 km is OpenWeatherMap's ceiling, not the sky's
      // limit, so it reads as "clear" rather than as a measurement.
      label: 'Visibility',
      icon: Eye,
      value: (w.visibility / 1000).toFixed(w.visibility < 10000 ? 1 : 0),
      unit: 'km',
      valueClass: w.visibility < 4000 ? 'text-brand-glow-amber' : '',
      unitClass: '',
      iconStyle: undefined
    },
    {
      // Air temperature closing on the dew point is the whole forecast for
      // mist. The spread is the number; the word is what you do with it.
      label: 'Fog risk',
      icon: CloudFog,
      value: fogRisk(w.dewSpread),
      unit: `${w.dewSpread.toFixed(1)}° spread`,
      valueClass: w.dewSpread <= 3 ? 'text-brand-glow-cyan' : '',
      unitClass: '',
      iconStyle: undefined
    },
    ...(props.airQuality
      ? [{
          // PM2.5 is the fraction small enough to scatter light, so this is a
          // haze reading before it is a health one: it says whether the hills
          // on the horizon will still be there at sunset.
          label: 'Air quality',
          icon: Waves,
          value: props.airQuality.label,
          unit: `${props.airQuality.pm25.toFixed(1)} µg/m³`,
          valueClass: props.airQuality.aqi >= 4 ? 'text-brand-glow-amber' : '',
          // `.t-label-xs` uppercases, and uppercasing this unit turns
          // MICROgrams into MILLIgrams - a thousandfold lie in two letters.
          unitClass: 'normal-case',
          iconStyle: undefined
        }]
      : []),
    {
      label: reportTime.label,
      icon: Clock3,
      value: reportTime.value,
      unit: reportTime.detail,
      valueClass: '',
      unitClass: 'normal-case',
      iconStyle: undefined
    }
  ]
})

/**
 * Fog needs the air to reach saturation, which is what a closing gap between
 * temperature and dew point measures. Under 1.5°C the two have effectively met.
 */
const fogRisk = (spreadC: number) => {
  if (spreadC <= 1.5) return 'Likely'
  if (spreadC <= 3) return 'Possible'
  return 'Unlikely'
}

const safetyText = computed(() => {
  if (!props.weather) return 'Unknown'
  switch (props.weather.flyability) {
    case 'safe': return 'Good to fly'
    case 'caution': return 'Fly with caution'
    case 'unsafe': return 'Do not fly'
    default: return 'Unknown'
  }
})

const safetyIcon = computed(() => {
  if (!props.weather) return Shield
  switch (props.weather.flyability) {
    case 'safe': return ShieldCheck
    case 'caution': return Shield
    case 'unsafe': return ShieldAlert
    default: return Shield
  }
})

const safetyTextColor = computed(() => {
  if (!props.weather) return 'text-ink-faint'
  switch (props.weather.flyability) {
    case 'safe': return 'text-brand-petrol-700 dark:text-brand-glow'
    case 'caution': return 'text-brand-glow-amber'
    case 'unsafe': return 'text-red-700 dark:text-red-400'
    default: return 'text-ink-faint'
  }
})

// Helper to convert degree to simple compass heading
const getCompassDirection = (deg: number) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round((deg % 360) / 22.5) % 16
  return directions[index]
}
</script>
