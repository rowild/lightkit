<template>
  <!-- Always dark, whatever the page's theme: the picture is a night sky, and the
       type sits on the picture. Same rule as the sky view's stage. -->
  <component
    :is="to ? NuxtLink : 'div'"
    ref="plateEl"
    :to="to"
    data-theme="dark"
    class="plate"
    :class="[to ? 'plate-live' : 'plate-planned', visible ? '' : 'plate-offscreen']"
  >
    <img
      class="plate-art"
      :src="art"
      alt=""
      decoding="async"
      :loading="to ? 'eager' : 'lazy'"
    />
    <div v-if="$slots.default" class="plate-omen" aria-hidden="true">
      <slot />
    </div>
    <div class="plate-veil"></div>

    <div class="plate-text">
      <component :is="to ? 'h2' : 'h3'" class="plate-title">{{ label }}</component>
      <p class="plate-note">{{ note }}</p>
      <span class="t-label-xs plate-state">{{ to ? 'Open' : 'Planned' }}</span>
    </div>
  </component>
</template>

<script setup lang="ts">
/**
 * One tool on the start page, as a plate: a picture, a thin inset frame, and its
 * name. With `to` it is a link that may carry an animation in its slot. Without
 * it the tool does not exist yet: a plain, grey box that is not a link, is not in
 * the tab order and ignores the pointer completely.
 */
import { ref, computed, onMounted, onUnmounted, resolveComponent } from 'vue'

defineProps<{
  label: string
  note: string
  art: string
  to?: string
}>()

const NuxtLink = resolveComponent('NuxtLink')

// The animations are SVG, which the browser repaints each frame. Off screen there
// is nobody to paint for, so they wait.
const plateEl = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)
const visible = ref(true)
const element = computed(() => {
  const value = plateEl.value
  return value && '$el' in value ? value.$el : (value as HTMLElement | null)
})

let observer: IntersectionObserver | null = null
onMounted(() => {
  if (!element.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => {
    visible.value = !!entry?.isIntersecting
  })
  observer.observe(element.value)
})
onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.plate {
  position: relative;
  display: block;
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--radius-2xl);
  background: #05080c;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-ink);
}

.plate-live {
  aspect-ratio: 5 / 4;
  cursor: pointer;
}

@media (min-width: 48rem) {
  .plate-live {
    aspect-ratio: auto;
    height: clamp(20rem, 48vh, 30rem);
  }
}

.plate-planned {
  aspect-ratio: 3 / 4;
  /* Greyed out and deaf to the mouse: no hover, no cursor, no tooltip. */
  pointer-events: none;
  user-select: none;
}

/* On a phone the last plate spans two columns, and 3:4 would make it huge. */
@media (max-width: 47.99rem) {
  li:last-child > .plate-planned {
    aspect-ratio: 8 / 5;
  }
}

.plate-art {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plate-planned .plate-art {
  filter: grayscale(1) brightness(0.5) contrast(0.85);
}

.plate-omen {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.plate-omen :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.plate-offscreen :deep(*) {
  animation-play-state: paused !important;
}

/* Darkens only behind the words, so the picture keeps its depth above them. */
.plate-veil {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(to top, rgba(3, 6, 9, 0.9) 0%, rgba(3, 6, 9, 0.55) 34%, transparent 62%);
}

/* The inset frame is what makes this a plate rather than a card. */
.plate::after {
  content: "";
  position: absolute;
  inset: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--radius-sm);
  pointer-events: none;
  transition: border-color 400ms ease;
}

.plate-text {
  position: absolute;
  inset: auto 0 0 0;
  padding: 1.25rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 1rem;
  align-items: baseline;
}

.plate-title {
  grid-column: 1 / -1;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(1.75rem, 3.4vw, 2.75rem);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: #fff;
}

.plate-note {
  margin-top: 0.375rem;
  font-size: 0.9375rem;
  line-height: 1.4;
  color: var(--color-ink-muted);
}

.plate-state {
  color: var(--color-brand-glow-amber);
}

.plate-planned .plate-text {
  padding: 1rem;
  display: block;
}

.plate-planned .plate-title {
  font-size: 1.1875rem;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--color-ink-muted);
}

.plate-planned .plate-note {
  font-size: 0.8125rem;
  color: var(--color-ink-faint);
}

.plate-planned .plate-state {
  display: block;
  margin-top: 0.5rem;
  color: var(--color-ink-faint);
}

/* Only where a pointer can really hover: on a phone a hover state sticks. */
@media (hover: hover) {
  .plate-art {
    transition: transform 1200ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }

  .plate-live:hover .plate-art {
    transform: scale(1.035);
  }

  .plate-live:hover::after {
    border-color: rgba(255, 194, 87, 0.65);
  }
}

.plate-live:focus-visible {
  outline-offset: 3px;
}
</style>
