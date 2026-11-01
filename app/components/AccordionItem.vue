<template>
  <div>
    <button
      type="button"
      class="tap w-full flex items-center justify-between gap-3 py-3 text-left t-title !text-brand-petrol-900 dark:!text-brand-glow hover:opacity-80 transition-opacity cursor-pointer"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="$emit('update:open', !open)"
    >
      <span class="flex items-center gap-2.5 min-w-0">
        <slot name="icon" />
        <span class="truncate">{{ title }}</span>
      </span>
      <ChevronDown
        class="accordion-chevron shrink-0"
        :class="open ? 'is-open' : ''"
        :size="14"
        :stroke-width="1.5"
      />
    </button>

    <div :id="panelId" class="accordion-panel" :class="open ? 'is-open' : ''">
      <!-- inert while closed: a folded field or link must not take the focus. -->
      <div class="accordion-inner" :inert="!open">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * One foldable section: a title that stays, content that does not.
 *
 * The only accordion in the app, so anything that folds looks the same as the
 * settings drawer does. The parent owns `open`, which is what lets Settings keep
 * one section open at a time.
 */
import { useId } from 'vue'
import { ChevronDown } from '@lucide/vue'

defineProps<{
  title: string
  open: boolean
}>()

defineEmits<{ (e: 'update:open', value: boolean): void }>()

const panelId = useId()
</script>

<style scoped>
.accordion-chevron {
  transition: transform 280ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.accordion-chevron.is-open {
  transform: rotate(180deg);
}

/* A grid row animating from 0fr to 1fr reaches the content's real height, however
   tall it is. The max-height it replaces had to guess a number, and Settings
   guessed 400px. */
.accordion-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 280ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.accordion-panel.is-open {
  grid-template-rows: 1fr;
}

/* `clip` with a margin, not `hidden`: the focus ring of a field at the panel's
   edge has to stay whole. Hidden after the fold has finished, since the margin
   would otherwise leave a few pixels of the content showing. */
.accordion-inner {
  min-height: 0;
  overflow: clip;
  overflow-clip-margin: 4px;
  visibility: hidden;
  transition: visibility 0s linear 280ms;
}

.is-open > .accordion-inner {
  visibility: visible;
  transition-delay: 0s;
}
</style>
