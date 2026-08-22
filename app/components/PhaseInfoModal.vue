<template>
  <InfoModal :open="open" title="Light phases" @update:open="emit('update:open', $event)">
    <div class="flex flex-col gap-3">
      <section
        v-for="phase in phases"
        :key="phase.id"
        :ref="el => setPhaseEl(phase.id, el)"
        class="flex flex-col gap-2 rounded-xl p-3 -mx-1 transition-colors"
        :class="phase.id === highlightId
          ? 'bg-brand-petrol-800/8 dark:bg-brand-green-800/40 ring-1 ring-brand-petrol-800/20 dark:ring-brand-green-500/30'
          : ''"
      >
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full shrink-0" :class="phase.dotClass"></span>
          <h3 class="t-label" :class="phase.titleClass">{{ phase.title }}</h3>
        </div>

        <p class="t-body-sm">{{ phase.look }}</p>

        <!-- Stacked on a phone: these values are phrases, not numbers, and a
             right-aligned column crowds the label. -->
        <div class="flex flex-col gap-2 mt-1">
          <div
            v-for="fact in phase.facts"
            :key="fact.label"
            class="flex flex-col gap-0.5 xs:flex-row xs:items-baseline xs:justify-between xs:gap-6"
          >
            <span class="t-label-xs shrink-0">{{ fact.label }}</span>
            <span class="t-body-sm !text-ink xs:text-right">{{ fact.value }}</span>
          </div>
        </div>
      </section>

      <p class="t-body-sm border-t border-brand-petrol-800/10 dark:border-brand-green-800/20 pt-4 mt-2">
        Times shift with latitude and season. Near the poles these phases
        stretch for hours, or do not happen at all.
      </p>
    </div>
  </InfoModal>
</template>

<script setup lang="ts">
/**
 * What each phase of light looks like, and what it is good for.
 *
 * It keeps its own file rather than being a call to `InfoModal` with prose in
 * the slot, because its content is a structured list with highlight behaviour.
 * The dialog shell itself IS `InfoModal` as of 2026-08-17: this component used
 * to draw its own, which rose from the bottom of a phone and was measured
 * against the LARGE viewport, so it hung below the fold and grew a second
 * scrollbar on the page behind it. `InfoModal` solved that once; there is no
 * reason for two answers to the same problem to exist.
 */
import { computed, watch, nextTick } from 'vue'
import InfoModal from './InfoModal.vue'

const props = defineProps<{
  open: boolean
  /** A solar segment name, e.g. "Evening Blue Hour". Highlights its phase. */
  highlight?: string | null
}>()

const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()

const phaseEls = new Map<string, HTMLElement>()

const setPhaseEl = (id: string, el: any) => {
  if (el) phaseEls.set(id, el as HTMLElement)
  else phaseEls.delete(id)
}

// The five phases the solar model produces. Morning and evening variants of
// golden and blue hour share an entry: they are the same light, mirrored.
const phases = [
  {
    id: 'daylight',
    title: 'Daylight',
    dotClass: 'bg-brand-petrol-500 dark:bg-emerald-400',
    titleClass: '',
    look: 'The sun sits high and lights everything directly. Contrast is strong and shadows are short and hard.',
    facts: [
      { label: 'Sun angle', value: 'More than 6° above the horizon' },
      { label: 'Best for', value: 'Mapping, inspection, high-speed action' },
      { label: 'Watch for', value: 'Blown highlights and harsh shadows' }
    ]
  },
  {
    id: 'golden',
    title: 'Golden hour',
    dotClass: 'bg-brand-glow-amber',
    titleClass: '!text-brand-glow-amber',
    look: 'Sunlight travels through more atmosphere and arrives at a low angle, so it turns soft, warm and golden. Shadows run long and give a scene depth.',
    facts: [
      { label: 'Sun angle', value: '0° to 6° above the horizon' },
      { label: 'Lasts', value: 'Roughly 20 to 50 minutes' },
      { label: 'Best for', value: 'Landscapes, architecture, warm portraits' }
    ]
  },
  {
    id: 'civil',
    title: 'Civil twilight',
    dotClass: 'bg-brand-petrol-400',
    titleClass: '',
    look: 'The sun is at or just under the horizon. Light is flat and muted, and it changes fast in either direction.',
    facts: [
      { label: 'Sun angle', value: '4° below to 0°' },
      { label: 'Lasts', value: 'Roughly 10 to 20 minutes' },
      { label: 'Best for', value: 'Getting set up before or after the good light' }
    ]
  },
  {
    id: 'blue',
    title: 'Blue hour',
    dotClass: 'bg-brand-glow-cyan',
    titleClass: '!text-brand-glow-cyan',
    look: 'The sun is below the horizon and casts no direct light. Shorter blue wavelengths scatter through the atmosphere and wash the scene in deep, cool blue.',
    facts: [
      { label: 'Sun angle', value: '4° to 8° below the horizon' },
      { label: 'Lasts', value: 'Roughly 20 to 30 minutes, fading fast' },
      { label: 'Best for', value: 'Cityscapes, silhouettes, lit windows' }
    ]
  },
  {
    id: 'night',
    title: 'Night',
    dotClass: 'bg-gray-500',
    titleClass: '',
    look: 'Civil twilight has ended and there is no usable daylight left.',
    facts: [
      { label: 'Sun angle', value: 'More than 8° below the horizon' },
      { label: 'Required', value: 'Anti-collision strobe lighting' },
      { label: 'Check', value: 'Local rules on night flight before you launch' }
    ]
  }
]

// Segment names carry morning/evening prefixes; the modal groups them.
const highlightId = computed(() => {
  const name = props.highlight || ''
  if (!name) return null
  if (name.includes('Golden')) return 'golden'
  if (name.includes('Blue')) return 'blue'
  if (name.includes('Civil')) return 'civil'
  if (name.includes('Daylight')) return 'daylight'
  if (name.includes('Night')) return 'night'
  return null
})

/**
 * Bring the highlighted phase into view, so opening from one segment of the
 * track lands on that segment's phase.
 *
 * `scrollIntoView` rather than arithmetic on `scrollTop`: the scrolling element
 * now belongs to `InfoModal`, and reaching into another component's DOM to
 * measure its offsets is exactly the coupling that splitting the shell out was
 * meant to remove. The page behind is locked while the dialog is open, so this
 * can only move the dialog's own body.
 *
 * A frame after `nextTick`, because the dialog enters with a scale transition
 * and has no final position until it has been laid out once.
 */
watch(() => props.open, async (open) => {
  if (!import.meta.client || !open) return

  await nextTick()
  requestAnimationFrame(() => {
    const target = highlightId.value ? phaseEls.get(highlightId.value) : null
    target?.scrollIntoView({ block: 'center' })
  })
})
</script>
