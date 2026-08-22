<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex flex-col divide-y divide-brand-petrol-800/8 dark:divide-brand-green-800/25">
      <div v-for="outcome in outcomes" :key="outcome.filter.name" class="row-kv py-1.5">
        <span class="flex items-baseline gap-1.5 min-w-0">
          <!-- The dot marks a strength this aircraft's maker actually sells.
               It never changes a number - product rule 1 - and every other
               strength stays in the list, which is product rule 3. -->
          <span
            v-if="kitStops.length"
            class="shrink-0 w-1.5 h-1.5 rounded-full self-center"
            :class="kitStops.includes(outcome.filter.stops)
              ? 'bg-brand-petrol-800 dark:bg-brand-glow'
              : 'bg-transparent'"
            :aria-label="kitStops.includes(outcome.filter.stops) ? 'In your kit' : undefined"
          />
          <span
            class="t-num-sm truncate"
            :class="isRecommended(outcome)
              ? 'font-semibold text-brand-petrol-800 dark:text-brand-glow'
              : 'text-ink'"
          >
            {{ outcome.filter.name }}
          </span>
          <span v-if="showStops" class="t-num-xs shrink-0">
            {{ outcome.filter.stops }} stop{{ outcome.filter.stops === 1 ? '' : 's' }}
          </span>
          <span class="text-ink-faint shrink-0" aria-hidden="true">&middot;</span>
          <span class="t-num-sm shrink-0" :class="isRecommended(outcome) ? 'font-semibold' : 'text-ink'">
            {{ outcome.label }}
          </span>
        </span>
        <span
          class="t-label-xs"
          :class="isRecommended(outcome)
            ? 'text-brand-petrol-800 dark:text-brand-glow'
            : 'text-ink-faint'"
        >
          <template v-if="isRecommended(outcome)">closest</template>
          <template v-else-if="describeOffset(outcome.offsetStops).amount">
            <span class="t-num-xs">{{ describeOffset(outcome.offsetStops).amount }}</span>
            {{ describeOffset(outcome.offsetStops).words }}
          </template>
          <template v-else>{{ describeOffset(outcome.offsetStops).words }}</template>
        </span>
      </div>
    </div>

    <!-- Product rule 3: gear may decide what starts expanded, never what is
         reachable. Every other strength stays one tap away. -->
    <button
      v-if="canNarrow"
      @click="$emit('toggle-all')"
      class="tap-sm t-label-xs text-ink-muted hover:text-ink transition-colors cursor-pointer self-start"
    >
      <template v-if="showAll">Show only filters for the {{ gearModel }}</template>
      <template v-else>Show all {{ totalFilters }} filters</template>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * What every filter would give, as a list.
 *
 * Rendered inline in the right column on a wide screen and inside a dialog on a
 * phone, which is the whole reason it is its own file: the same markup in two
 * places in one template would need every future change made twice.
 */
import { describeOffset } from '../../utils/nd'
import type { FilterOutcome } from '../../utils/nd'

withDefaults(
  defineProps<{
    outcomes: FilterOutcome[]
    isRecommended: (outcome: FilterOutcome) => boolean
    canNarrow: boolean
    showAll: boolean
    gearModel: string | undefined
    totalFilters: number
    /** Print how many stops each filter blocks. On in the explaining dialog. */
    showStops?: boolean
    /** Strengths the selected model's maker sells. Empty means "no gear picked". */
    kitStops?: number[]
  }>(),
  { showStops: false, kitStops: () => [] }
)

defineEmits<{ 'toggle-all': [] }>()
</script>
