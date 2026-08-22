<template>
  <div ref="rootEl" class="relative" @keydown.esc="open = false">
    <!-- The trigger IS the current mode. No frame around it: three framed
         buttons in the corner of every screen spent a pill's worth of space
         saying what one icon says, and the footer's own rule already separates
         it from the page. -->
    <button
      type="button"
      @click="open = !open"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="`Display theme: ${activeMode.label}`"
      v-tooltip="'Change the theme'"
      class="grid place-items-center h-7 w-7 rounded-full text-ink-faint hover:text-ink transition-colors duration-200 cursor-pointer"
    >
      <component :is="activeMode.icon" :size="15" :stroke-width="1.75" />
    </button>

    <!-- Upwards, because this lives on the bottom edge of the screen. -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="open"
        role="radiogroup"
        aria-label="Display theme"
        class="absolute bottom-full right-0 mb-1.5 z-50 flex flex-col gap-0.5 p-1 rounded-xl glass-panel shadow-lg"
      >
        <button
          v-for="mode in modes"
          :key="mode.value"
          type="button"
          role="radio"
          :aria-checked="currentMode === mode.value"
          :aria-label="mode.label"
          v-tooltip="mode.hint"
          @click="selectMode(mode.value)"
          class="grid place-items-center h-8 w-8 rounded-lg transition-colors duration-200 cursor-pointer"
          :class="currentMode === mode.value
            ? 'bg-brand-petrol-800/20 text-brand-petrol-800 dark:bg-brand-green-500/25 dark:text-brand-glow'
            : 'text-ink-faint hover:text-ink'"
        >
          <component :is="mode.icon" :size="15" :stroke-width="1.75" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * Light, dark, or follow the system.
 *
 * A popup rather than a row of three, since 2026-08-17. The row was always
 * visible and always mostly wrong: two of its three buttons showed a mode the
 * user was not in. The trigger now shows the mode you ARE in, and the other two
 * appear only when you go looking for them.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sun, Moon, Monitor } from '@lucide/vue'

type ThemeMode = 'light' | 'dark' | 'auto'

const emit = defineEmits<{
  (e: 'theme-changed', isDark: boolean): void
}>()

const currentMode = ref<ThemeMode>('auto')
const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const modes = [
  { value: 'light', label: 'Light', icon: Sun, hint: 'Always light' },
  { value: 'dark', label: 'Dark', icon: Moon, hint: 'Always dark' },
  { value: 'auto', label: 'System', icon: Monitor, hint: 'Follow the system setting' }
] as const

const activeMode = computed(() => modes.find(m => m.value === currentMode.value) ?? modes[2])

let mediaQuery: MediaQueryList | null = null

const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
  if (currentMode.value === 'auto') {
    applyTheme(e.matches)
  }
}

const applyTheme = (isDark: boolean) => {
  emit('theme-changed', isDark)
}

const selectMode = (mode: ThemeMode) => {
  currentMode.value = mode
  localStorage.setItem('color-theme', mode)
  open.value = false

  if (mode === 'auto') {
    if (mediaQuery) {
      applyTheme(mediaQuery.matches)
    }
  } else {
    applyTheme(mode === 'dark')
  }
}

const closeOnOutsideClick = (e: MouseEvent) => {
  if (!open.value) return
  if (!rootEl.value?.contains(e.target as Node)) open.value = false
}

onMounted(() => {
  // Safe client-side check
  const savedMode = localStorage.getItem('color-theme') as ThemeMode | null
  currentMode.value = savedMode || 'auto'

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  // Initialize current theme state
  if (currentMode.value === 'auto') {
    applyTheme(mediaQuery.matches)
  } else {
    applyTheme(currentMode.value === 'dark')
  }

  // Setup listener
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  } else {
    // Deprecated API fallback for older browsers
    mediaQuery.addListener(handleSystemThemeChange)
  }

  document.addEventListener('click', closeOnOutsideClick)
})

onUnmounted(() => {
  if (mediaQuery) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    } else {
      mediaQuery.removeListener(handleSystemThemeChange)
    }
  }

  document.removeEventListener('click', closeOnOutsideClick)
})
</script>
