<template>
  <div
    class="flex flex-col justify-between safe-inset"
    :class="fitViewport
      ? 'h-svh max-h-svh overflow-hidden'
      : 'min-h-svh overflow-x-hidden lg:h-screen lg:max-h-screen lg:overflow-hidden'"
  >
    <BackgroundShader :isDark="isDark" />

    <div
      class="max-w-7xl w-full mx-auto grow flex flex-col justify-between gap-5 md:gap-6 min-h-0"
      :class="fitViewport
        ? 'h-full max-h-full overflow-hidden'
        : 'lg:h-full lg:max-h-full lg:overflow-hidden'"
    >
      <header class="shrink-0 animate-panel">
        <Wordmark heading :subtitle="activeTool.label" :version="version">
          <AppMenu
            @open-settings="settingsOpen = true"
            @open-about-nd="aboutNdOpen = true"
            @open-phase-info="phaseInfoOpen = true"
          />
        </Wordmark>
      </header>

      <ApiKeyModal
        v-model:open="settingsOpen"
        :apiKey="apiKey"
        :isDark="isDark"
        @save="setApiKey"
        @clear="clearApiKey"
      />

      <InfoModal v-model:open="aboutNdOpen" title="About ND filters">
        <AboutNdFilters />
      </InfoModal>

      <!-- Owned by the shell, because the menu opens it and the menu is the
           shell's. It is reachable from every tool, which is why it no longer
           needs a header of its own on the solar panel. -->
      <PhaseInfoModal v-model:open="phaseInfoOpen" />

      <slot />

      <!-- The theme switch lives out here rather than in the menu: it is a
           setting about the whole page, not a place to go. It shows the mode
           you are in and opens the other two upwards on a tap. No labels -
           three icons for light, dark and system say it themselves. -->
      <!-- shrink-0 so the bar keeps its full height and stays on the bottom
           edge of the screen. Every tool sets `fitViewport`, so nothing here
           scrolls past it. -->
      <footer class="shrink-0 pt-3 sm:pt-4 border-t border-brand-petrol-800/10 dark:border-brand-green-800/20 flex items-center justify-between gap-4 t-label-xs animate-panel">
        <span class="normal-case">&copy; 2025-26 by <a href="https://rowild.works" target="_blank" rel="noopener noreferrer" class="text-brand-glow-amber hover:underline font-semibold">rowild.works &mdash; digital studio</a></span>
        <ThemeToggle class="shrink-0" @theme-changed="setDark" />
      </footer>

      <!-- PWA Update Toast -->
      <Transition
        enter-active-class="transition duration-350 ease-out transform"
        enter-from-class="translate-y-12 opacity-0 scale-95"
        enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in transform"
        leave-from-class="translate-y-0 opacity-100 scale-100"
        leave-to-class="translate-y-12 opacity-0 scale-95"
      >
        <div
          v-if="updateExists"
          class="fixed left-1/2 -translate-x-1/2 z-9999 flex items-center gap-3 px-4 py-3 rounded-2xl glass-panel border border-brand-petrol-800/20 dark:border-brand-green-500/30 shadow-2xl backdrop-blur-xl"
          :style="{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))' }"
        >
          <div class="flex items-center gap-2.5">
            <div class="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></div>
            <span class="t-label-xs text-ink">Update available</span>
          </div>
          <button
            @click="refreshApp"
            class="tap-sm cursor-pointer px-3.5 py-2 bg-brand-petrol-800 hover:bg-brand-petrol-700 dark:bg-brand-glow dark:hover:bg-brand-glow/85 text-white dark:text-brand-petrol-950 t-label-xs rounded-xl shadow-md transition-colors duration-200"
          >
            Update now
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The shell every tool sits inside: background, header, menu, modals, footer,
 * and the service-worker plumbing.
 *
 * It owns nothing a single tool owns. Location, date and weather moved into the
 * solar page with that tool; only the resolved theme and the API key are shared
 * here, through composables, because the menu and the settings drawer need them.
 */
import { ref, computed, onMounted } from 'vue'
import BackgroundShader from '../components/BackgroundShader.vue'
import ApiKeyModal from '../components/ApiKeyModal.vue'
import AppMenu from '../components/AppMenu.vue'
import Wordmark from '../components/Wordmark.vue'
import InfoModal from '../components/InfoModal.vue'
import AboutNdFilters from '../components/AboutNdFilters.vue'
import PhaseInfoModal from '../components/PhaseInfoModal.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useTheme } from '../composables/useTheme'
import { useApiKey } from '../composables/useApiKey'
import { toolForPath } from '../data/tools'
import pkg from '../../package.json'

const version = pkg.version
const route = useRoute()

// Which tool the URL is on. Read from the route rather than kept in a ref, so a
// bookmarked or shared link shows the right name without a second source of
// truth to keep in step.
const activeTool = computed(() => toolForPath(route.path))

/**
 * Whether this page promises to fit the viewport, so the shell may cap its own
 * height and hide overflow on a phone as well as on a desktop.
 *
 * Route meta rather than a shared ref: fitting the screen is a fact about the
 * page, and meta travels with the URL. A ref the page wrote into the layout
 * would be a second source of truth, which is the trap recorded above for the
 * retired `dpt:active-app` key.
 *
 * `svh`, not `vh` or `dvh`. `svh` is the viewport height with the browser
 * chrome showing, so the layout is sized for its worst moment. `dvh` changes as
 * chrome retracts, which would resize the ND dial under the user's finger.
 */
const fitViewport = computed(() => route.meta.fitViewport === true)

const { isDark, setDark } = useTheme()
const { apiKey, restore, setApiKey, clearApiKey } = useApiKey()

const settingsOpen = ref(false)
const aboutNdOpen = ref(false)
const phaseInfoOpen = ref(false)

// Theme lives on a data attribute, not a class. useHead MERGES class strings
// rather than replacing them, which left <html class="dark light"> once the user
// switched to light: every `dark:` variant kept matching in light mode.
useHead({
  htmlAttrs: {
    'data-theme': computed(() => (isDark.value ? 'dark' : 'light'))
  }
})

// PWA update state
const updateExists = ref(false)
let workerToActivate: ServiceWorker | null = null

const refreshApp = () => {
  updateExists.value = false
  workerToActivate?.postMessage({ type: 'SKIP_WAITING' })
}

onMounted(async () => {
  restore()

  // GSAP reveal. Honour "reduce motion": show everything, animate nothing.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.remove('js-loading')
  } else {
    try {
      const { gsap } = await import('gsap')
      const { SplitText } = await import('gsap/SplitText')
      gsap.registerPlugin(SplitText)

      const titleSplit = new SplitText('.animate-title', { type: 'chars' })
      const tl = gsap.timeline()

      tl.from(titleSplit.chars, {
        duration: 0.6, opacity: 0, y: 10, stagger: 0.04, ease: 'power3.out'
      })
      tl.from('.animate-panel', {
        duration: 0.8, opacity: 0, y: 12, stagger: 0.12, ease: 'power3.out'
      }, '-=0.2')

      document.body.classList.remove('js-loading')
    } catch (e) {
      document.body.classList.remove('js-loading')
      console.warn('GSAP animations failed to initialize', e)
    }
  }

  // Service worker. Skipped on localhost, where a cached worker fights HMR.
  if (!('serviceWorker' in navigator)) return

  const isDev = ['localhost', '127.0.0.1'].some(h => window.location.hostname.includes(h))

  if (isDev) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => [])
    for (const reg of registrations) await reg.unregister().catch(() => {})
    return
  }

  navigator.serviceWorker.register('/sw.js').then((reg) => {
    if (reg.waiting) {
      workerToActivate = reg.waiting
      updateExists.value = true
    }

    reg.addEventListener('updatefound', () => {
      const installing = reg.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          workerToActivate = installing
          updateExists.value = true
        }
      })
    })
  }).catch((err) => {
    console.warn('[PWA] Service Worker registration failed:', err)
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
})
</script>
