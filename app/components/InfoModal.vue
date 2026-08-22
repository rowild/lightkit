<template>
  <ClientOnly>
    <Teleport to="body">
      <!-- Backdrop -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 bg-black/55 backdrop-blur-sm"
          :class="elevated ? 'z-8000' : 'z-6000'"
          @click="close"
        ></div>
      </Transition>

      <!-- Centred on every size. It used to rise from the bottom on a phone,
           which put the title under the thumb and the text against the edge.
           The wrapper does the centring and keeps a margin, so the dialog never
           touches the screen edge; it is pointer-events-none so the backdrop
           behind it still takes a click to dismiss. -->
      <Transition
        enter-active-class="transition duration-250 ease-out"
        enter-from-class="opacity-0 scale-95"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0 scale-95"
      >
        <!-- h-svh, not inset-0.

             `position: fixed` resolves against the LARGE viewport on a mobile
             browser - the height with the toolbar retracted - so `inset-0`
             makes this box taller than what the user can actually see whenever
             the toolbar is showing. A dialog centred in it hangs below the
             fold, and the page grows a scrollbar to reach the part that is cut
             off, on top of the dialog's own inner scroll. `h-svh` is the height
             with the toolbar shown, which is the worst case and therefore the
             safe one. -->
        <!-- flex, not grid.

             A percentage max-height on a grid item resolves against its grid
             track. The track here is auto-sized, so it grows to whatever the
             dialog asks for, and `max-height: 100%` then measures the dialog
             against itself and never binds. Measured at 1524px tall in a 667px
             viewport. A flex container with a definite height resolves the
             percentage against that height instead. -->
        <div
          v-if="open"
          class="fixed inset-x-0 top-0 h-svh flex items-center justify-center p-5 sm:p-8 pointer-events-none"
          :class="elevated ? 'z-8001' : 'z-6001'"
        >
          <!-- An absolute cap rather than a percentage. A percentage depends on
               how the parent sizes itself, which is exactly what failed here;
               100svh minus this wrapper's own padding depends on nothing. -->
          <div
            ref="dialogEl"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            tabindex="-1"
            class="pointer-events-auto w-full max-w-xl max-h-[calc(100svh-2.5rem)] sm:max-h-[calc(100svh-4rem)] flex flex-col bg-white dark:bg-bg-dark border border-brand-petrol-800/15 dark:border-brand-green-800/30 rounded-2xl shadow-2xl"
            @keydown.esc="close"
          >
            <div class="shrink-0 flex items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-brand-petrol-800/10 dark:border-brand-green-800/20">
              <h2 :id="titleId" class="t-title text-brand-petrol-900 dark:text-brand-glow">
                {{ title }}
              </h2>
              <button
                @click="close"
                aria-label="Close"
                v-tooltip="'Close this window'"
                class="tap grid items-center justify-end rounded-full text-ink-faint hover:text-ink transition-colors cursor-pointer shrink-0"
              >
                <X :size="20" :stroke-width="1.75" />
              </button>
            </div>

            <!-- min-h-0 is what lets this shrink below its content and scroll
                 instead of pushing the dialog past its cap. A flex item's
                 automatic minimum size is its content, and overflow alone is
                 not something to rely on to zero it. -->
            <div class="grow min-h-0 overflow-y-auto px-6 py-6">
              <slot />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * A titled dialog with arbitrary content, teleported to body.
 *
 * PhaseInfoModal keeps its own file because its content is a structured list of
 * solar phases with highlight behaviour. Anything that is just a title and some
 * prose belongs here instead of growing another bespoke modal.
 */
import { ref, watch, nextTick, onUnmounted, useId } from 'vue'
import { X } from '@lucide/vue'

const props = defineProps<{
  open: boolean
  title: string
  /**
   * Raise above the app menu, which sits at z-7000. Set when the dialog is
   * opened from inside the menu and the menu should stay open behind it, so the
   * reader keeps their place in the list.
   */
  elevated?: boolean
}>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()

const titleId = useId()
const dialogEl = ref<HTMLElement | null>(null)

const close = () => emit('update:open', false)

/**
 * Lock the page behind the dialog so a phone cannot scroll the backdrop.
 *
 * Both elements, not just body. `overflow` on body only reaches the viewport
 * while html's own overflow is `visible`, which is true today and is exactly
 * the kind of thing a later stylesheet change breaks silently.
 */
const setPageScroll = (locked: boolean) => {
  const value = locked ? 'hidden' : ''
  document.body.style.overflow = value
  document.documentElement.style.overflow = value
}

// Focus the dialog on open so Escape reaches it without the user tabbing first.
watch(
  () => props.open,
  async (isOpen) => {
    if (!import.meta.client) return
    setPageScroll(isOpen)
    if (isOpen) {
      await nextTick()
      dialogEl.value?.focus()
    }
  }
)

onUnmounted(() => {
  if (import.meta.client) setPageScroll(false)
})
</script>
