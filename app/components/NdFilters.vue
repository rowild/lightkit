<template>
  <!-- Phone: one column that fills the height it is given, with the dial taking
       whatever the fixed rows leave. Desktop: two columns, inputs and dial on
       the left, the outcomes table on the right. -->
  <div class="flex flex-col gap-3 h-full min-h-0 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-stretch">
    <div class="flex flex-col gap-2 min-h-0 grow lg:col-span-7">
      <!-- Gear. One row with the label inline, because vertical space is the
           scarce thing on this screen. Rule 1: this changes no number. -->
      <div class="glass-panel px-3 py-2 rounded-xl shadow-sm flex items-center gap-2 shrink-0">
        <label for="gear" class="t-label shrink-0">Gear</label>
        <select
          id="gear"
          v-model="selectedGearId"
          class="grow min-w-0 px-2 py-1.5 rounded-lg glow-input t-body-sm cursor-pointer"
        >
          <option :value="ANY_GEAR_ID">Other / camera not listed</option>
          <optgroup v-for="group in brandGroups" :key="group.brand" :label="group.brand">
            <option v-for="gear in group.models" :key="gear.id" :value="gear.id">
              {{ gear.model }}
            </option>
          </optgroup>
        </select>
        <button
          @click="gearInfoOpen = true"
          class="tap-sm -m-1 p-1 grid place-items-center rounded-full text-ink-faint hover:text-ink transition-colors cursor-pointer shrink-0"
          aria-label="About the gear list"
          v-tooltip="'What the gear list is for'"
        >
          <Info :size="14" :stroke-width="1.75" />
        </button>
      </div>

      <!-- The two readings. Both are numbers the pilot reads off the aircraft,
           which is why they sit together and above the dial. -->
      <div class="glass-panel px-3 py-2.5 rounded-xl shadow-sm flex flex-col gap-2 shrink-0">
        <StopSlider
          v-model="meteredIndex"
          :items="shutterSpeeds"
          :ticks="wholeStopShutterIndices"
          :scale="shutterScale"
          label="Metered shutter"
        />
        <StopSlider
          v-model="apertureIndex"
          :items="apertureItems"
          :ticks="apertureTicks"
          :scale="apertureScale"
          label="Your aperture"
          off-label="— not set"
        />
      </div>

      <!-- The dial. The only element allowed to grow or shrink.

           flex, not grid. An implicit grid column is auto-sized, so it grows to
           whatever the dial asks for, and the dial's own `max-w-full` then
           measures itself against itself and never binds - it drew 460px wide
           inside a 408px column on a 440px phone and ran off the screen. A flex
           container's content box is definite, so the percentage resolves
           against the space that actually exists. -->
      <!-- items-center. On a phone the dial is limited by the column's width,
           so once it is as wide as it can be there is vertical slack left over.
           Pinning it to the top piled all of that slack under the dial, which
           on a tall screen left it stranded against the sliders with a hand's
           width of nothing below. Centring splits the slack instead, so the
           dial sits in the middle of whatever room it is given.

           This only does anything when there is slack: on a short screen the
           dial's own `max-h-full` binds first, there is nothing left to split,
           and centring is a no-op. The slot keeps `grow` so that `max-h-full`
           has a definite height to resolve against. -->
      <div class="grow min-h-0 flex items-center justify-center">
        <FrameRateDial
          v-model="frameRateIndex"
          :items="dialItems"
          :centre-title="ringTitle"
          :centre-caption="ringCaption"
          :dimmed="targetMode === 'time'"
          unit="fps"
          aria-label="Frame rate"
        />
      </div>

      <!-- Two lines, because the frame-rate readout and the aperture answer are
           different things and neither fits beside the other on a phone. -->
      <div class="flex flex-col gap-1 shrink-0">
        <div class="row-kv">
          <span class="t-label-xs normal-case flex items-baseline gap-1.5">
            <span class="t-num-xs">{{ targetLabel }}</span>
            <span class="text-ink-faint" aria-hidden="true">&middot;</span>
            <span class="t-num-xs">{{ shutterAngle }}&deg;</span>
            <button
              @click="targetInfoOpen = true"
              class="tap-sm -m-1 p-1 grid place-items-center rounded-full text-ink-faint hover:text-ink transition-colors cursor-pointer"
              aria-label="Change the shutter angle, or set a fixed time"
              v-tooltip="'Change the shutter angle, or set a fixed time'"
            >
              <Info :size="13" :stroke-width="1.75" />
            </button>
          </span>
          <!-- Shown at every size, not just on a phone. On a phone it is the
               only way to the list; on a desktop the list is already in the
               right-hand column, but the explanation of what a stop is only
               lives here. -->
          <button
            @click="outcomesOpen = true"
            class="tap-sm t-label-xs text-ink-muted hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Info :size="13" :stroke-width="1.75" />
            ND filters
          </button>
        </div>

        <div class="row-kv">
          <span class="t-label">{{ trimLabel }}</span>
          <span class="t-num font-semibold text-brand-petrol-800 dark:text-brand-glow">
            {{ trimValue }}
          </span>
        </div>
      </div>
    </div>

    <!-- Desktop only: the outcomes table keeps its own column. -->
    <div class="hidden lg:flex lg:flex-col lg:col-span-5 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
      <div class="glass-panel p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-2.5 grow">
        <h4 class="t-label">What each filter gives you</h4>
        <OutcomeList v-bind="outcomeListProps" @toggle-all="showAllFilters = !showAllFilters" />
      </div>
    </div>

    <!-- The same list, plus what a stop is. On a phone this is also the only
         route to the list, which is what product rule 3 requires. -->
    <InfoModal v-model:open="outcomesOpen" title="What each ND filter does">
      <div class="flex flex-col gap-4">
        <p class="t-body-sm">
          An ND filter is grey glass. It blocks light so you can keep a slow
          shutter in bright sun, and it changes nothing else &mdash; no colour,
          no sharpness.
        </p>
        <p class="t-body-sm">
          The number tells you how much light it holds back. ND2 blocks half of
          it, which photographers call one stop. ND4 blocks three quarters, or
          two stops. ND8 blocks seven eighths, three stops. Each step doubles
          the last one, and every stop lets you halve your shutter speed.
        </p>
        <!-- items-start plus a top margin, not self-center: centring puts the
             dot halfway down a three-line paragraph instead of beside the word
             it is explaining. 0.5em is the middle of the first line. -->
        <p v-if="highlightedStops.length" class="t-body-sm flex items-start gap-2">
          <span class="shrink-0 w-1.5 h-1.5 mt-[0.5em] rounded-full bg-brand-petrol-800 dark:bg-brand-glow" />
          <span>
            This dot marks a filter sold for the {{ activeGear?.model }}. The
            others work just as well &mdash; other makers sell them.
          </span>
        </p>

        <div class="border-t border-brand-petrol-800/10 dark:border-brand-green-800/20 pt-4">
          <h3 class="t-label mb-2.5">From your {{ metered.label }} reading</h3>
          <OutcomeList
            v-bind="outcomeListProps"
            show-stops
            :kit-stops="highlightedStops"
            @toggle-all="showAllFilters = !showAllFilters"
          />
        </div>
      </div>
    </InfoModal>

    <InfoModal v-model:open="targetInfoOpen" title="Your target">
      <div class="flex flex-col gap-5">
        <p class="t-body-sm">
          The shutter angle says how long the shutter stays open in each frame.
          180 degrees means it is open for half of it. That is the film
          convention, and it looks natural. A smaller angle looks sharper. A
          larger one blurs more.
        </p>

        <div class="flex flex-col gap-2">
          <span id="nd-angle-label" class="t-label">Shutter angle</span>
          <div role="group" aria-labelledby="nd-angle-label" class="flex flex-wrap gap-1.5">
            <button
              v-for="angle in shutterAngles"
              :key="angle"
              type="button"
              :aria-pressed="targetMode === 'rate' && shutterAngle === angle"
              @click="selectAngle(angle)"
              class="tap-sm px-2.5 h-9 rounded-lg border transition-colors t-num-sm cursor-pointer"
              :class="targetMode === 'rate' && shutterAngle === angle
                ? 'bg-brand-petrol-800 text-white dark:bg-brand-glow dark:text-brand-petrol-950 border-transparent'
                : 'border-brand-petrol-800/15 dark:border-brand-green-800/30 bg-brand-petrol-800/6 dark:bg-brand-green-800/25 hover:bg-brand-petrol-800/12 dark:hover:bg-brand-green-800/40'"
            >
              {{ angle }}&deg;
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-2 border-t border-brand-petrol-800/10 dark:border-brand-green-800/20 pt-5">
          <label for="nd-target-time" class="t-label">Or set a fixed time</label>
          <select
            id="nd-target-time"
            v-model="targetIndex"
            @change="targetMode = 'time'"
            class="w-full px-3 py-2 rounded-xl glow-input t-num-sm h-11 cursor-pointer"
          >
            <option v-for="(speed, idx) in shutterSpeeds" :key="idx" :value="idx">
              {{ speed.label }}
            </option>
          </select>
          <p class="t-body-sm">
            Turn the dial and the tool goes back to a frame rate, so you cannot
            get stuck here.
          </p>
        </div>
      </div>
    </InfoModal>

    <InfoModal v-model:open="gearInfoOpen" title="Your gear">
      <div class="flex flex-col gap-4">
        <p class="t-body-sm">
          Picking your gear changes none of the numbers. It only shortens the
          filter list to the ones sold for that model.
        </p>
        <p class="t-body-sm">
          The rest stay one tap away under &ldquo;show all&rdquo;, because other
          makers sell strengths that your own maker skips.
        </p>

        <div v-if="unverifiedGear.length" class="flex flex-col gap-2.5 border-t border-brand-petrol-800/10 dark:border-brand-green-800/20 pt-4">
          <h3 class="t-label">Not in the list</h3>
          <p class="t-body-sm">
            These were checked but left out. Pick &ldquo;Other&rdquo; and choose
            your filter by hand &mdash; the maths is the same.
          </p>
          <ul class="flex flex-col gap-2">
            <li
              v-for="item in unverifiedGear"
              :key="`${item.brand} ${item.model}`"
              class="t-body-sm text-ink-muted"
            >
              <span class="text-ink font-semibold">{{ item.brand }} {{ item.model }}</span>
              &mdash; {{ item.reason }}
            </li>
          </ul>
        </div>
      </div>
    </InfoModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Info } from '@lucide/vue'
import { usePersistedRef } from '../composables/usePersistedRef'
import InfoModal from './InfoModal.vue'
import StopSlider from './nd/StopSlider.vue'
import FrameRateDial from './nd/FrameRateDial.vue'
import OutcomeList from './nd/OutcomeList.vue'
import { ANY_GEAR_ID, gearGroups, findGear, unverifiedGear } from '../data/gear'
import {
  apertures,
  apertureLabel,
  apertureTrim,
  wholeStopApertureIndices,
  labelledApertureIndices
} from '../utils/aperture'
import {
  shutterSpeeds,
  ndFilters,
  frameRates,
  formatExposure,
  shutterFromFrameRate,
  requiredStops,
  nearestFilter,
  filterOutcomes,
  describeOffset,
  wholeStopShutterIndices,
  labelledShutterIndices,
  SHUTTER_ANGLE_DEFAULT,
  DEFAULT_SPEED_INDEX,
  type FilterOutcome
} from '../utils/nd'

const meteredIndex = usePersistedRef('nd-metered-index', DEFAULT_SPEED_INDEX)
const frameRate = usePersistedRef('nd-fps', 25)
const shutterAngle = usePersistedRef('nd-angle', SHUTTER_ANGLE_DEFAULT)
// 'rate' derives the target from frame rate; 'time' takes it directly.
const targetMode = usePersistedRef<'rate' | 'time'>('nd-target-mode', 'rate')
const targetIndex = usePersistedRef('nd-target-index', DEFAULT_SPEED_INDEX)

/**
 * 0 means "not set", and index i means apertures[i - 1].
 *
 * It defaults to off on purpose. Many drones have a fixed iris - a DJI Mini 4
 * Pro is locked at f/1.7 and cannot be stopped down - so a real f-number here
 * would hand those pilots advice they cannot follow, on first run, before they
 * had any chance to say otherwise.
 */
const apertureIndex = usePersistedRef('nd-aperture', 0)

// Generic presets, not tied to any camera's actual angle steps - rule 1 keeps
// the camera model out of every input, this one included.
const shutterAngles = [45, 90, 180, 270, 360]

// Not persisted: a dialog that reopens itself on every visit is a bug.
const gearInfoOpen = ref(false)
const targetInfoOpen = ref(false)
const outcomesOpen = ref(false)

const metered = computed(
  () => shutterSpeeds[meteredIndex.value] ?? shutterSpeeds[DEFAULT_SPEED_INDEX]!
)

/**
 * The printed numbers along the shutter scale.
 *
 * Abbreviated here rather than in the slider: which part of a label can be
 * dropped depends on what the label means. "1/8000 s" keeps its fraction and
 * loses the unit, while "4.0 s" loses the pointless decimal and keeps the s,
 * because "4" alone next to "1/8000" reads as 1/4.
 */
const shutterScale = labelledShutterIndices.map(index => {
  const label = shutterSpeeds[index]!.label
  return {
    index,
    text: label.startsWith('1/')
      ? label.replace(' s', '')
      : label.replace('.0 s', 's').replace(' s', 's')
  }
})

const targetSeconds = computed(() =>
  targetMode.value === 'rate'
    ? shutterFromFrameRate(frameRate.value, shutterAngle.value)
    : (shutterSpeeds[targetIndex.value] ?? shutterSpeeds[DEFAULT_SPEED_INDEX]!).value
)

const targetLabel = computed(() =>
  targetMode.value === 'rate'
    ? `${frameRate.value} fps · ${formatExposure(targetSeconds.value).label}`
    : `fixed ${formatExposure(targetSeconds.value).label}`
)

const needed = computed(() => requiredStops(metered.value.value, targetSeconds.value))

/** True when the target is faster than what the camera already meters. */
const needsMoreLight = computed(() => needed.value <= 0)

const match = computed(() => nearestFilter(needed.value, ndFilters))

const outcomes = computed(() =>
  filterOutcomes(metered.value.value, targetSeconds.value, ndFilters)
)

// --- the dial --------------------------------------------------------------

// The label is what the ring prints; the value is what places it on the track,
// which the dial spaces logarithmically. Each rate's shutter time is on the
// readout line under the dial for whichever rate is selected; printing all
// seven would need the label ring pushed outward until the answer ring no
// longer holds "ND1000" on a phone.
// The unit is the dial's business, not this file's: only the dial knows how
// wide it has been drawn, and that decides whether "240 fps" still fits.
const dialItems = frameRates.map(rate => ({ label: `${rate}`, value: rate }))

/**
 * The dial's index, written back as a frame rate.
 *
 * Turning it always returns to 'rate' mode. A pilot who set a fixed time once
 * and then forgot must never be stuck: touching the dial is the way out.
 */
const frameRateIndex = computed({
  get: () => {
    const found = frameRates.indexOf(frameRate.value)
    return found === -1 ? 0 : found
  },
  set: (index: number) => {
    frameRate.value = frameRates[index] ?? frameRates[0]!
    targetMode.value = 'rate'
  }
})

const ringTitle = computed(() =>
  needsMoreLight.value ? 'None' : match.value?.filter.name ?? '—'
)

// Two lines, chosen here rather than left to whatever width the ring happens to
// be. The dial renders it with whitespace-pre-line.
const ringCaption = computed(() =>
  needsMoreLight.value ? 'No filter\nneeded' : 'Recommended\nFilter'
)

// --- the aperture trim -----------------------------------------------------

// `value` places each stop along the track, which the slider spaces
// logarithmically; `label` is what the readout prints.
const apertureItems = apertures.map(f => ({ label: apertureLabel(f), value: f }))

// Shifted by one, because the slider prepends its "not set" position and the
// mark indices have to live in the same space as the slider's value.
const apertureTicks = wholeStopApertureIndices.map(index => index + 1)

const apertureScale = labelledApertureIndices.map(index => ({
  index: index + 1,
  text: apertureLabel(apertures[index]!)
}))

/** null when the slider sits in its "not set" position. */
const currentAperture = computed(() =>
  apertureIndex.value === 0 ? null : apertures[apertureIndex.value - 1] ?? null
)

const trim = computed(() => {
  if (needsMoreLight.value || !match.value || currentAperture.value === null) return null
  return apertureTrim(currentAperture.value, match.value.residualStops)
})

/**
 * The answer line's label and value.
 *
 * With an aperture set it names the f-number to dial in. Without one it falls
 * back to the honest leftover in stops, which is what product rule 4 demands
 * and what the panel said before this rebuild.
 */
const trimLabel = computed(() => {
  if (needsMoreLight.value) return 'No filter needed'
  if (!trim.value) return 'How close it lands'
  return trim.value.clamped ? 'As far as your lens goes' : 'Set your aperture to'
})

const trimValue = computed(() => {
  if (needsMoreLight.value) return '—'

  if (!trim.value) {
    const offset = describeOffset(match.value?.residualStops ?? 0)
    return offset.amount ? `${offset.amount} ${offset.words}` : offset.words
  }

  const leftover = describeOffset(trim.value.leftoverStops)
  const f = apertureLabel(trim.value.fNumber)
  return leftover.amount ? `${f} · ${leftover.amount} ${leftover.words}` : f
})

// --- the outcomes list -----------------------------------------------------

const selectedGearId = usePersistedRef('nd-gear', ANY_GEAR_ID)
const activeGear = computed(() => findGear(selectedGearId.value))
const brandGroups = gearGroups()

// Presentation only. Product rule 3: this decides what starts expanded and
// nothing else. `outcomes` above is computed from the full ndFilters range.
const showAllFilters = usePersistedRef('nd-show-all-filters', false)

const highlightedStops = computed(() => activeGear.value?.knownStops ?? [])

const visibleOutcomes = computed(() => {
  if (showAllFilters.value || highlightedStops.value.length === 0) return outcomes.value
  return outcomes.value.filter(o => highlightedStops.value.includes(o.filter.stops))
})

/** Marks the recommended row, so it reads "closest" instead of repeating the
    offset the answer line already gave. */
const isRecommended = (outcome: FilterOutcome): boolean =>
  !needsMoreLight.value && match.value?.filter === outcome.filter

/** One object, so the same list can be bound in two places without repeating
    six props at each call site. */
const outcomeListProps = computed(() => ({
  outcomes: visibleOutcomes.value,
  isRecommended,
  canNarrow: highlightedStops.value.length > 0,
  showAll: showAllFilters.value,
  gearModel: activeGear.value?.model,
  totalFilters: ndFilters.length
}))

const selectAngle = (angle: number) => {
  shutterAngle.value = angle
  targetMode.value = 'rate'
}
</script>
