<template>
  <div>
    <!-- Trigger. The negative margin cancels the padding, so the 44px touch
         target does not push the wordmark around. -->
    <button
      @click="isOpen = true"
      class="tap -m-2 p-2 grid items-center justify-end rounded-lg text-ink-faint hover:text-brand-petrol-800 dark:hover:text-brand-glow transition-colors duration-200 cursor-pointer shrink-0 wordmark-icon"
      aria-label="Open menu"
      v-tooltip="'Open the menu'"
      :aria-expanded="isOpen"
    >
      <Menu :size="20" :stroke-width="1.75" />
    </button>

    <ClientOnly>
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0"
        >
          <div
            v-if="isOpen"
            ref="panelEl"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabindex="-1"
            class="fixed inset-0 z-7000 bg-bg-light dark:bg-bg-dark safe-inset overflow-y-auto"
            @keydown.esc="isOpen = false"
          >
            <!-- Same max width as the page shell. A narrower one here would
                 move the wordmark sideways on a wide screen the moment the menu
                 opened, which is the one thing this lockup must never do. -->
            <div class="max-w-7xl w-full mx-auto flex flex-col min-h-full pb-6">
              <Wordmark :subtitle="activeTool.label" :version="version">
                <button
                  @click="isOpen = false"
                  aria-label="Close menu"
                  v-tooltip="'Close the menu'"
                  class="tap -m-2 p-2 grid items-center justify-end rounded-lg text-ink-faint hover:text-brand-petrol-800 dark:hover:text-brand-glow transition-colors duration-200 cursor-pointer shrink-0 wordmark-icon"
                >
                  <X :size="20" :stroke-width="1.75" />
                </button>
              </Wordmark>

              <!-- The list stays narrow: a menu row stretched across a desktop
                   puts its label and its chevron a screen apart. -->
              <nav class="flex flex-col mt-10 w-full max-w-xl">
                <h2 class="t-label-xs text-ink-faint mb-2 pl-1">Tools</h2>

                <!-- One panel per group, on the same surface as every card in
                     the app. The panel is what says "these belong together";
                     spacing alone was not doing it. -->
                <div class="menu-reveal glass-panel rounded-2xl overflow-hidden" :style="{ '--row-index': 0 }">
                  <!-- The link and its info button are siblings, never nested.
                       A <button> inside an <a> is invalid, and its click would
                       bubble into the link and navigate instead of explaining. -->
                  <div
                    v-for="tool in tools"
                    :key="tool.id"
                    class="menu-row group flex items-stretch"
                    :class="tool.id === activeTool.id
                      ? 'bg-brand-petrol-800/8 dark:bg-brand-green-800/30'
                      : 'hover:bg-brand-petrol-800/5 dark:hover:bg-brand-green-800/15'"
                  >
                    <NuxtLink
                      :to="tool.path"
                      @click="isOpen = false"
                      :aria-current="tool.id === activeTool.id ? 'page' : undefined"
                      class="tap grow flex items-center justify-start px-4 py-3.5 text-left cursor-pointer min-w-0"
                    >
                      <span
                        class="font-display font-light text-xl leading-none truncate transition-colors duration-200"
                        :class="tool.id === activeTool.id
                          ? 'text-brand-glow-amber'
                          : 'text-ink group-hover:text-brand-petrol-800 dark:group-hover:text-brand-glow'"
                      >{{ tool.label }}</span>
                    </NuxtLink>

                    <button
                      @click="infoTool = tool"
                      class="tap px-4 grid place-items-center text-ink-faint hover:text-ink transition-colors cursor-pointer shrink-0"
                      :aria-label="`About ${tool.label}`"
                      v-tooltip="`What ${tool.label} is for`"
                    >
                      <Info :size="16" :stroke-width="1.75" />
                    </button>
                  </div>
                </div>

                <h2 class="t-label-xs text-ink-faint mb-2 mt-7 pl-1">More</h2>

                <div class="menu-reveal glass-panel rounded-2xl overflow-hidden" :style="{ '--row-index': 1 }">
                  <button
                    v-for="item in extras"
                    :key="item.event"
                    @click="fire(item.event)"
                    class="menu-row group tap w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer hover:bg-brand-petrol-800/5 dark:hover:bg-brand-green-800/15"
                  >
                    <span class="t-body !text-ink">{{ item.label }}</span>
                    <ChevronRight
                      :size="18"
                      :stroke-width="1.75"
                      class="menu-chevron text-ink-faint group-hover:text-ink shrink-0"
                    />
                  </button>
                </div>
              </nav>
            </div>

            <!-- Elevated above the menu panel, so the menu stays open behind it
                 and the reader keeps their place in the list. -->
            <InfoModal
              elevated
              :open="!!infoTool"
              :title="infoTool?.label ?? ''"
              @update:open="infoTool = null"
            >
              <div v-if="infoTool" class="flex flex-col gap-4">
                <p class="t-body !text-ink">{{ infoTool.note }}</p>
                <p v-for="para in infoTool.about" :key="para" class="t-body-sm">
                  {{ para }}
                </p>
              </div>
            </InfoModal>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
/**
 * The app's only navigation.
 *
 * Every tool is a route, so the rows are real links: a pilot can bookmark the ND
 * calculator, share it, or land on it from history. The active row is read from
 * the URL rather than from a ref, so there is no second source of truth to keep
 * in step.
 *
 * "Tools" rather than "Apps": these are instruments inside one app, and tool is
 * the word a pilot uses for a light meter or a filter.
 */
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { Menu, X, ChevronRight, Info } from '@lucide/vue'
import Wordmark from './Wordmark.vue'
import InfoModal from './InfoModal.vue'
import { tools, toolForPath, type Tool } from '../data/tools'
import pkg from '../../package.json'

type ExtraEvent = 'open-settings' | 'open-about-nd' | 'open-phase-info'

const emit = defineEmits<{
  (e: ExtraEvent): void
}>()

const version = pkg.version
const route = useRoute()
const activeTool = computed(() => toolForPath(route.path))

// "Light phases" lives here rather than behind an ⓘ on the solar panel: the
// panel header it used to sit in was the tallest thing on that screen and
// carried no information a pilot needed twice.
const extras: { event: ExtraEvent; label: string }[] = [
  { event: 'open-phase-info', label: 'Light phases' },
  { event: 'open-about-nd', label: 'About ND filters' },
  { event: 'open-settings', label: 'Settings' }
]

const isOpen = ref(false)
const panelEl = ref<HTMLElement | null>(null)

// The tool whose info dialog is open, or null. Not persisted: a dialog that
// reopens itself on every visit is a bug.
const infoTool = ref<Tool | null>(null)

const fire = (event: ExtraEvent) => {
  emit(event)
  isOpen.value = false
}

watch(isOpen, async (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    await nextTick()
    panelEl.value?.focus()
  }
})

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>
