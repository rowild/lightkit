<template>
  <div class="min-w-0">
    <!-- The wordmark and its trailing control share a row of their own, so the
         cap-height correction in .wordmark-row keeps working once a subtitle
         sits underneath. -->
    <div class="wordmark-row flex items-center justify-between gap-3">
      <div class="flex items-baseline gap-2 min-w-0">
        <component
          :is="heading ? 'h1' : 'span'"
          class="font-display font-light text-[clamp(1.5rem,6vw,2.25rem)] leading-none tracking-[-0.01em] text-brand-petrol-800 dark:text-brand-glow whitespace-nowrap min-w-0"
          :class="heading ? 'animate-title' : ''"
        >
          LightKit
        </component>
        <!-- Trails the name, quiet and small, the way a plate number sits on an
             instrument. Baseline-aligned, so it rides the wordmark's own line
             rather than floating against its box. -->
        <span v-if="version" class="t-num-xs text-ink-faint shrink-0 tabular-nums">
          {{ version }}
        </span>
      </div>
      <slot />
    </div>

    <!-- Which tool you are in. Amber because that is this app's accent, the
         same one the active menu row is lit with. -->
    <p v-if="subtitle" class="t-label-xs !text-brand-glow-amber mt-1.5 truncate">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * The wordmark lockup, shared by the page header and the menu.
 *
 * One component rather than two copies: the menu opens over the header, and the
 * wordmark must not move when it does. A shared component makes that structural
 * instead of a coincidence two files have to keep agreeing on.
 */
defineProps<{
  /** The active tool's name, shown beneath the wordmark. */
  subtitle?: string
  /** Render as <h1>. True on the page, false inside the menu dialog. */
  heading?: boolean
  /** Shown small and quiet ahead of the wordmark. */
  version?: string
}>()
</script>
