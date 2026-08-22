<template>
  <!-- No trigger button here any more: the app menu opens this drawer, so the
       header carries one control instead of two. The wrapper <div> that used to
       hold that button went with it. Left in place it was an empty box in the
       layout's flex column, and `justify-between` paid a 20px gap on each side
       of it - 20px of the phone's screen spent on nothing.

       Overlay backdrop and drawer panel are teleported to body. -->
  <ClientOnly>
      <Teleport to="body">
        <!-- Overlay backdrop -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <!-- No dark class needed here any more: the theme now lives on <html>,
               so teleported content inherits it like everything else. -->
          <div v-if="isOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[5000]" @click="isOpen = false"></div>
        </Transition>

        <!-- Drawer Panel -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <div
            v-if="isOpen"
            class="fixed top-0 right-0 h-full w-full max-w-md bg-white/97 dark:bg-bg-dark/97 border-l border-brand-petrol-800/12 dark:border-brand-green-800/25 shadow-2xl z-[5000] safe-inset flex flex-col justify-between"
          >
            <!-- Header and Body wrapper -->
            <div class="flex flex-col h-full overflow-hidden">
              <!-- Header -->
              <div class="flex items-center justify-between gap-3 border-b border-brand-petrol-800/10 dark:border-brand-green-800/20 pb-4 pr-1">
                <h3 class="font-display font-semibold text-lg tracking-wide uppercase text-brand-petrol-900 dark:text-brand-glow">
                  Settings
                </h3>
                <button
                  @click="isOpen = false"
                  aria-label="Close settings"
                  v-tooltip="'Close settings'"
                  class="tap grid items-center justify-end rounded-full text-ink-faint hover:text-ink transition-colors shrink-0"
                >
                  <X :size="20" :stroke-width="1.75" />
                </button>
              </div>

              <!-- Accordion Menu Content -->
              <div class="flex-grow overflow-y-auto space-y-4 py-6 pr-1 select-none">
                
                <!-- ACCORDION 1: WEATHER API KEYS (BYOK) -->
                <div class="border-b border-brand-petrol-800/10 dark:border-brand-green-800/10 pb-4">
                  <button
                    @click="toggleSection('api')"
                    class="tap w-full flex items-center justify-between gap-3 py-3 text-left t-title !text-brand-petrol-900 dark:!text-brand-glow hover:opacity-80 transition-opacity"
                  >
                    <span class="flex items-center space-x-2.5">
                      <Key :size="14" :stroke-width="1.5" />
                      <span>Weather API key</span>
                    </span>
                    <component :is="activeSection === 'api' ? ChevronUp : ChevronDown" :size="14" :stroke-width="1.5" />
                  </button>

                  <Transition name="slide">
                    <div v-show="activeSection === 'api'" class="mt-2 flex flex-col gap-3 pl-6 t-body-sm">
                      <p>
                        Live wind speed, gust force, cloud cover, humidity, precipitation and pressure come from OpenWeatherMap. The key is stored in this browser only.
                      </p>
                      <p>
                        Don't have a key? Sign up at
                        <a href="https://openweathermap.org/appid" target="_blank" class="text-brand-petrol-600 dark:text-brand-glow underline hover:opacity-80">openweathermap.org</a>
                        to get a free API key (takes about 10–60 minutes to activate after sign up).
                      </p>
                      
                      <div class="space-y-2">
                        <label class="block t-label">OpenWeatherMap API key</label>
                        <div class="relative">
                          <input
                            :type="showKey ? 'text' : 'password'"
                            v-model="inputKey"
                            placeholder="Paste your API key here"
                            class="w-full px-4 py-2.5 h-11 rounded-lg glow-input t-body-sm pr-11"
                          />
                          <button
                            @click="showKey = !showKey"
                            :aria-label="showKey ? 'Hide the key' : 'Show the key'"
                            v-tooltip="showKey ? 'Hide the key' : 'Show the key'"
                            class="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-lg text-ink-faint hover:text-ink"
                          >
                            <Eye v-if="!showKey" :size="16" :stroke-width="1.75" />
                            <EyeOff v-else :size="16" :stroke-width="1.75" />
                          </button>
                        </div>
                        <p v-if="savedMessage" class="t-label-xs !text-brand-petrol-700 dark:!text-brand-glow mt-1">
                          API key saved.
                        </p>
                      </div>

                      <div class="flex space-x-2 pt-1">
                        <button
                          @click="clearKey"
                          class="tap px-4 py-2 border border-brand-petrol-800/25 dark:border-brand-green-800/40 rounded-lg t-label-xs hover:bg-brand-petrol-800/8 dark:hover:bg-brand-green-950/30 transition-colors"
                        >
                          Clear key
                        </button>
                        <button
                          @click="saveKey"
                          class="tap px-4 py-2 bg-brand-petrol-800 dark:bg-brand-glow rounded-lg t-label-xs !text-white dark:!text-brand-petrol-950 hover:opacity-90 transition-opacity"
                        >
                          Save key
                        </button>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- ACCORDION 2: WEATHER OVERLAY STRENGTH -->
                <!-- Here rather than on the map: how heavy the clouds are drawn
                     is a taste you set once, not a control you reach for while
                     planning a flight. The map keeps only the switch. -->
                <div class="border-b border-brand-petrol-800/10 dark:border-brand-green-800/10 pb-4">
                  <button
                    @click="toggleSection('overlay')"
                    class="tap w-full flex items-center justify-between gap-3 py-3 text-left t-title !text-brand-petrol-900 dark:!text-brand-glow hover:opacity-80 transition-opacity"
                  >
                    <span class="flex items-center space-x-2.5">
                      <Cloud :size="14" :stroke-width="1.5" />
                      <span>Weather overlay</span>
                    </span>
                    <component :is="activeSection === 'overlay' ? ChevronUp : ChevronDown" :size="14" :stroke-width="1.5" />
                  </button>

                  <Transition name="slide">
                    <div v-show="activeSection === 'overlay'" class="mt-2 flex flex-col gap-4 pl-6 t-body-sm">
                      <p>
                        How strongly each layer is painted over the map. Lower it
                        to keep the ground readable underneath.
                      </p>

                      <div v-for="layer in WEATHER_LAYERS" :key="layer.id" class="flex flex-col gap-1">
                        <div class="row-kv">
                          <label :for="`overlay-${layer.id}`" class="t-label">{{ layer.label }}</label>
                          <span class="t-num-sm text-ink">{{ opacity[layer.id] }}%</span>
                        </div>
                        <input
                          :id="`overlay-${layer.id}`"
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          class="stop-slider"
                          :value="opacity[layer.id]"
                          @input="setOpacity(layer.id, Number(($event.target as HTMLInputElement).value))"
                        />
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- ACCORDION 3: PRE-FLIGHT UAV SAFETY CHECKLIST -->
                <div class="border-b border-brand-petrol-800/10 dark:border-brand-green-800/10 pb-4">
                  <button
                    @click="toggleSection('safety')"
                    class="tap w-full flex items-center justify-between gap-3 py-3 text-left t-title !text-brand-petrol-900 dark:!text-brand-glow hover:opacity-80 transition-opacity"
                  >
                    <span class="flex items-center space-x-2.5">
                      <ShieldCheck :size="14" :stroke-width="1.5" />
                      <span>Pre-flight checklist</span>
                    </span>
                    <component :is="activeSection === 'safety' ? ChevronUp : ChevronDown" :size="14" :stroke-width="1.5" />
                  </button>

                  <Transition name="slide">
                    <div v-show="activeSection === 'safety'" class="mt-2 flex flex-col gap-1 pl-6 t-body-sm">
                      <div v-for="(item, idx) in checklist" :key="idx" class="flex items-start gap-2 py-1.5">
                        <input
                          type="checkbox"
                          :id="'chk-'+idx"
                          class="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-petrol-800/40 accent-brand-petrol-800 dark:accent-brand-glow cursor-pointer"
                        />
                        <label :for="'chk-'+idx" class="cursor-pointer select-none pl-1">
                          {{ item }}
                        </label>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- ACCORDION 4: SYSTEM CACHE & RESET -->
                <div class="border-b border-brand-petrol-800/10 dark:border-brand-green-800/10 pb-4">
                  <button
                    @click="toggleSection('system')"
                    class="tap w-full flex items-center justify-between gap-3 py-3 text-left t-title !text-brand-petrol-900 dark:!text-brand-glow hover:opacity-80 transition-opacity"
                  >
                    <span class="flex items-center space-x-2.5">
                      <RotateCcw :size="14" :stroke-width="1.5" />
                      <span>System utilities</span>
                    </span>
                    <component :is="activeSection === 'system' ? ChevronUp : ChevronDown" :size="14" :stroke-width="1.5" />
                  </button>

                  <Transition name="slide">
                    <div v-show="activeSection === 'system'" class="mt-2 flex flex-col gap-3 pl-6 t-body-sm">
                      <p>Clear all locally cached parameters, including the OpenWeatherMap API key and theme preferences, to reset LightKit to factory default.</p>
                      <button
                        @click="resetSystem"
                        class="tap self-start px-4 py-2 bg-red-500/10 dark:bg-red-950/25 border border-red-600/35 rounded-lg t-label-xs !text-red-700 dark:!text-red-400 hover:bg-red-500/20 dark:hover:bg-red-900/30 transition-colors"
                      >
                        Reset system data
                      </button>
                    </div>
                  </Transition>
                </div>

              </div>
            </div>

            <!-- The theme switch used to sit here, where nobody found it. It
                 lives at the foot of the app menu now. One control, one place. -->
          </div>
        </Transition>
      </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Key,
  ShieldCheck,
  RotateCcw,
  Sun,
  Cloud
} from '@lucide/vue'
import { useWeatherOverlay, WEATHER_LAYERS } from '../composables/useWeatherOverlay'

const { opacity, restore: restoreOverlay, setOpacity } = useWeatherOverlay()

const props = defineProps<{
  apiKey: string
  // Kept for the parent's template contract; the drawer itself no longer needs
  // to know the theme, since <html data-theme> now reaches teleported content.
  isDark: boolean
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'save', key: string): void
  (e: 'clear'): void
  (e: 'update:open', value: boolean): void
}>()

// Controlled by the parent. The drawer used to own a cog button in the header
// and its own open state; the app menu is the single way in now, so the state
// lives with whoever opens it.
const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})
const showKey = ref(false)
const inputKey = ref('')
const savedMessage = ref(false)

// Accordion open/close tracker
const activeSection = ref<string | null>('api')

const checklist = [
  'Verify airspace restrictions & drone flight zone eligibility.',
  'Verify wind speed & gust thresholds are within pilot manuals.',
  'Calibrate drone compass and confirm GPS homepoint lock.',
  'Inspect structural integrity of propellers & motor rotors.',
  'Confirm battery voltage levels & backup controller charge.',
  'Establish and maintain constant visual line of sight (VLOS).'
]

onMounted(() => {
  inputKey.value = props.apiKey
  // On mount, never during setup: reading storage in setup makes the client's
  // first render disagree with the server's HTML, and Vue does not repair that
  // in production - the stored setting would silently fail to apply.
  restoreOverlay()
})

const toggleSection = (section: string) => {
  activeSection.value = activeSection.value === section ? null : section
}

const saveKey = () => {
  emit('save', inputKey.value)
  savedMessage.value = true
  setTimeout(() => {
    savedMessage.value = false
    isOpen.value = false
  }, 1200)
}

const clearKey = () => {
  inputKey.value = ''
  emit('clear')
  isOpen.value = false
}

const resetSystem = () => {
  if (confirm('Are you sure you want to clear all configurations? This will wipe your API key.')) {
    localStorage.clear()
    window.location.reload()
  }
}
</script>

<style scoped>
/* Accordion smooth transition */
.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
  max-height: 400px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
