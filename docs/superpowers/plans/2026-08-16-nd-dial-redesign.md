# ND Dial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the ND tool around a frame-rate dial with the recommended
filter glowing at its centre, two sliders for the metered shutter speed and the
current aperture, and a layout that fits one phone screen without scrolling.

**Architecture:** All arithmetic stays in pure, Vue-free modules under
`app/utils/` so it is unit-testable in a plain node environment. Three dumb
presentational components under `app/components/nd/` take a value and emit a new
one; none of them knows what an ND filter is. `NdFilters.vue` remains the only
place that wires state to arithmetic. The no-scroll behaviour is opt-in per page
through route meta, so the solar page is untouched.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, Tailwind v4 with
tokens in `app/assets/css/main.css`, Vitest (node environment), `@lucide/vue`
icons.

**Spec:** [`docs/superpowers/specs/2026-08-16-nd-dial-redesign-design.md`](../specs/2026-08-16-nd-dial-redesign-design.md)

## Global Constraints

These bind every task. Most are lifted verbatim from `AGENTS.md`.

- **Product rule 1** — the camera model is never a mathematical input. The new
  aperture value is a reading the user sets on a slider. It must never be
  derived from `selectedGearId`.
- **Product rule 3** — no ND strength may become unreachable. The outcomes list
  may be hidden behind one tap, never removed.
- **Product rule 4** — never snap the result to a commercial kit. Report the
  leftover error honestly.
- **Product rule 5** — store attenuation as stops; derive the factor with
  `2 ** stops`.
- **Fonts** — `--font-display` (Josefin Sans) for display sizes only.
  `--font-caps` for uppercase labels only, never lowercase. `--font-sans` (IBM
  Plex Sans) for anything read as a sentence and for every form control.
  `--font-mono` for every digit that changes or sits in a column. Never set a
  changing number in Josefin: it has no tabular figures.
- **Type roles** — use `.t-label`, `.t-label-xs`, `.t-title`, `.t-body`,
  `.t-body-sm`, `.t-num`, `.t-num-sm`, `.t-num-xs`, `.t-hero-num` rather than raw
  size utilities.
- **Colour** — use `--color-ink`, `--color-ink-muted`, `--color-ink-faint` for
  text. Tailwind only defines steps 50, 100, 200 … 900, 950; an invented step
  such as `gray-550` silently generates no CSS.
- **Theme** — light and dark must both work. Dark overrides are written as
  `[data-theme="dark"] .selector` in `main.css`, matching `.glass-panel`.
- **Persistence** — `usePersistedRef(key, fallback)` under the `dpt:` namespace.
  Restore happens on mount, never during setup.
- **Baselines** — rows mixing font sizes use `align-items: baseline` or
  `.row-kv`, never `items-center`.
- **Accessibility** — keyboard operation and ARIA roles are added where they are
  cheap. They never drive a layout or visual decision. Do not add a task, a
  wrapper element, or a visible control for accessibility alone.
- **Verification** — `npm test` must be green before every commit. There is no
  lint or typecheck script in this repo.

---

### Task 1: Aperture arithmetic

**Files:**
- Create: `app/utils/aperture.ts`
- Test: `test/aperture.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `apertures: number[]`
  - `apertureLabel(fNumber: number): string`
  - `stopsBetween(from: number, to: number): number`
  - `apertureAfterStops(from: number, stops: number): number`
  - `nearestAperture(fNumber: number): { fNumber: number; index: number }`
  - `apertureTrim(currentF: number, residualStops: number): ApertureTrim`
  - `interface ApertureTrim { fNumber: number; index: number; stops: number; leftoverStops: number; clamped: boolean }`

- [x] **Step 1: Write the failing test**

Create `test/aperture.spec.ts`. The `~` alias points at `app/`, set in
`vitest.config.ts`.

```ts
import { describe, it, expect } from 'vitest'
import {
  apertures,
  apertureLabel,
  stopsBetween,
  apertureAfterStops,
  nearestAperture,
  apertureTrim
} from '~/utils/aperture'

describe('apertures', () => {
  it('runs from widest to narrowest', () => {
    const sorted = [...apertures].sort((a, b) => a - b)
    expect(apertures).toEqual(sorted)
  })

  // The entries are marketed labels, not exact powers of the square root of
  // two, so label-to-label gaps are uneven: f/11 to f/13 is 0.48 stops and
  // f/13 to f/14 is 0.21. Asserting a tight per-step tolerance would only
  // assert that the series had been falsified. What matters is that it never
  // goes backwards, never jumps a whole stop, and spans the right total.
  it('always moves forward, and never by a whole stop', () => {
    for (let i = 1; i < apertures.length; i++) {
      const step = stopsBetween(apertures[i - 1]!, apertures[i]!)
      expect(step).toBeGreaterThan(0)
      expect(step).toBeLessThan(0.5)
    }
  })

  it('spans eight stops, which is 24 third-stop steps', () => {
    expect(apertures).toHaveLength(25)
    // 7.948, not 8.000. The 0.05 is the rounding in the printed labels adding
    // up across the whole series, and it is the price of matching what a lens
    // barrel says rather than what the arithmetic says.
    const span = stopsBetween(apertures[0]!, apertures[apertures.length - 1]!)
    expect(Math.abs(span - 8)).toBeLessThan(0.1)
  })

  it('contains the full stops', () => {
    for (const full of [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22]) {
      expect(apertures).toContain(full)
    }
  })
})

describe('apertureLabel', () => {
  it('prints one decimal below f/10', () => {
    expect(apertureLabel(2)).toBe('f/2.0')
    expect(apertureLabel(5.6)).toBe('f/5.6')
  })

  it('prints whole numbers from f/10 up', () => {
    expect(apertureLabel(10)).toBe('f/10')
    expect(apertureLabel(22)).toBe('f/22')
  })
})

describe('stopsBetween', () => {
  it('counts one stop across a full-stop pair', () => {
    expect(stopsBetween(2.8, 4)).toBeCloseTo(1, 1)
    expect(stopsBetween(4, 5.6)).toBeCloseTo(1, 1)
  })

  it('is negative when the target is wider', () => {
    expect(stopsBetween(4, 2.8)).toBeCloseTo(-1, 1)
  })

  it('is zero for the same aperture', () => {
    expect(stopsBetween(4, 4)).toBe(0)
  })
})

describe('apertureAfterStops', () => {
  it('closes the iris for positive stops', () => {
    expect(apertureAfterStops(2.8, 1)).toBeCloseTo(3.96, 1)
  })

  it('opens the iris for negative stops', () => {
    expect(apertureAfterStops(4, -1)).toBeCloseTo(2.83, 1)
  })

  it('round-trips with stopsBetween', () => {
    const moved = apertureAfterStops(3.5, 1.7)
    expect(stopsBetween(3.5, moved)).toBeCloseTo(1.7, 10)
  })
})

describe('nearestAperture', () => {
  it('returns an exact member unchanged', () => {
    expect(nearestAperture(5.6)).toEqual({ fNumber: 5.6, index: apertures.indexOf(5.6) })
  })

  it('snaps in stop space, not linear space', () => {
    // 3.13 sits 0.32 stops from f/2.8 but only 0.06 from f/3.2.
    expect(nearestAperture(3.13).fNumber).toBe(3.2)
  })

  it('clamps below the series', () => {
    expect(nearestAperture(0.9).fNumber).toBe(1.4)
  })

  it('clamps above the series', () => {
    expect(nearestAperture(40).fNumber).toBe(22)
  })
})

describe('apertureTrim', () => {
  it('closes the iris when the filter is too weak', () => {
    // needed 2.32 stops, ND4 gives 2, so residual is -0.32.
    const trim = apertureTrim(2.8, -0.3219)
    expect(trim.fNumber).toBe(3.2)
    expect(trim.stops).toBeGreaterThan(0)
    expect(Math.abs(trim.leftoverStops)).toBeLessThan(0.1)
    expect(trim.clamped).toBe(false)
  })

  it('opens the iris when the filter is too strong', () => {
    const trim = apertureTrim(4, 0.5)
    expect(trim.fNumber).toBeLessThan(4)
    expect(trim.stops).toBeLessThan(0)
  })

  it('leaves the aperture alone when the filter is spot on', () => {
    const trim = apertureTrim(4, 0)
    expect(trim.fNumber).toBe(4)
    expect(trim.stops).toBe(0)
    expect(trim.leftoverStops).toBe(0)
  })

  it('reports a clamp when the ideal falls off the series', () => {
    // Nine stops of opening from f/1.4 is far below anything that exists.
    expect(apertureTrim(1.4, 9).clamped).toBe(true)
    expect(apertureTrim(1.4, 9).fNumber).toBe(1.4)
  })

  it('reports leftover honestly after snapping', () => {
    const trim = apertureTrim(2.8, -0.3219)
    // filter residual plus the trim actually achieved
    expect(trim.leftoverStops).toBeCloseTo(-0.3219 + trim.stops, 10)
  })
})
```

- [x] **Step 2: Run the test and watch it fail**

Run: `npm test -- aperture`
Expected: FAIL, `Failed to resolve import "~/utils/aperture"`.

- [x] **Step 3: Write the module**

Create `app/utils/aperture.ts`:

```ts
/**
 * Aperture arithmetic for the ND filter tool.
 *
 * Deliberately free of Vue, Nuxt and browser APIs so it can be unit tested in a
 * plain node environment, exactly like `nd.ts` beside it.
 *
 * Product rule 1 still holds. Nothing here reads the selected gear. The
 * f-number is a reading the user sets, in the same way the metered shutter
 * speed is a reading the user sets.
 */

/**
 * The 1/3-stop f-number series, widest first.
 *
 * These are the marketed labels, not exact powers of the square root of two.
 * `shutterSpeeds` makes the same choice for the same reason: a calculation
 * built on the label matches the number the user reads off the aircraft.
 */
export const apertures: number[] = [
  1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5,
  5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22
]

/**
 * How an f-number is printed.
 *
 * Cameras carry one decimal on the wide half of the scale and drop it from f/10
 * up, which is where the third-stops become whole numbers anyway.
 */
export const apertureLabel = (fNumber: number): string =>
  `f/${fNumber < 10 ? fNumber.toFixed(1) : String(Math.round(fNumber))}`

/**
 * Stops of light between two f-numbers. Positive means `to` is the darker one.
 *
 * The factor of two is not a fudge: an f-number is a ratio of lengths, and the
 * light through the hole goes as its area, so one stop is a factor of the
 * square root of two in the f-number.
 */
export const stopsBetween = (from: number, to: number): number =>
  2 * Math.log2(to / from)

/**
 * The f-number reached by changing exposure by `stops`.
 * Positive stops close the iris, so the f-number rises.
 */
export const apertureAfterStops = (from: number, stops: number): number =>
  from * Math.pow(2, stops / 2)

/**
 * The nearest entry in the series.
 *
 * Distance is measured in stops, not in raw f-numbers. The series is
 * geometric, so a linear comparison would drag every answer towards the wide
 * end where the numbers sit closer together.
 *
 * The series is a non-empty constant, so this always returns a value.
 */
export const nearestAperture = (fNumber: number): { fNumber: number; index: number } => {
  let index = 0
  for (let i = 1; i < apertures.length; i++) {
    const candidate = Math.abs(stopsBetween(apertures[i]!, fNumber))
    const chosen = Math.abs(stopsBetween(apertures[index]!, fNumber))
    if (candidate < chosen) index = i
  }
  return { fNumber: apertures[index]!, index }
}

export interface ApertureTrim {
  /** The f-number to set, snapped to the series. */
  fNumber: number
  /** Its index in `apertures`. */
  index: number
  /** Stops the user is asked to move. Positive closes the iris. */
  stops: number
  /**
   * What is still uncovered once the aperture has moved, in stops. Feeds the
   * same `describeOffset` the panel already uses, so product rule 4 is kept:
   * the leftover is reported, never hidden.
   */
  leftoverStops: number
  /** True when the ideal value fell outside f/1.4 to f/22 and was clamped. */
  clamped: boolean
}

/**
 * The aperture to set so the chosen filter's leftover error disappears.
 *
 * `residualStops` comes straight from `nearestFilter` in `nd.ts`. Positive
 * means the filter blocks more than needed and the frame is too dark, so the
 * iris opens and the f-number falls. Negative means the filter is too weak, so
 * the iris closes and the f-number rises. Hence the sign flip below.
 */
export const apertureTrim = (currentF: number, residualStops: number): ApertureTrim => {
  const ideal = apertureAfterStops(currentF, -residualStops)
  const snapped = nearestAperture(ideal)
  const stops = stopsBetween(currentF, snapped.fNumber)

  return {
    fNumber: snapped.fNumber,
    index: snapped.index,
    stops,
    leftoverStops: residualStops + stops,
    clamped: ideal < apertures[0]! || ideal > apertures[apertures.length - 1]!
  }
}
```

- [x] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS. All three files green.

- [x] **Step 5: Commit**

```bash
git add app/utils/aperture.ts test/aperture.spec.ts
git commit -m "feat: add aperture arithmetic for the ND trim readout"
```

---

### Task 2: Add 240 fps

**Files:**
- Modify: `app/utils/nd.ts:122`
- Test: `test/nd.spec.ts`

**Interfaces:**
- Consumes: `frameRates`, `shutterFromFrameRate` from Task 0 (already in the repo).
- Produces: `frameRates` with seven entries, so `FrameRateDial` in Task 5 lays
  ticks 45 degrees apart across its 270 degree track.

- [x] **Step 1: Write the failing test**

Append to `test/nd.spec.ts`, inside the existing `describe('shutterFromFrameRate')`
block or after it as its own block:

```ts
describe('frameRates', () => {
  it('offers seven rates, so the dial ticks land 45 degrees apart', () => {
    expect(frameRates).toEqual([24, 25, 30, 50, 60, 120, 240])
  })

  it('gives 1/480 s for 240 fps at 180 degrees', () => {
    expect(shutterFromFrameRate(240)).toBeCloseTo(1 / 480, 10)
  })
})
```

Add `frameRates` to the import block at the top of the file.

- [x] **Step 2: Run the test and watch it fail**

Run: `npm test -- nd`
Expected: FAIL, the array is `[24, 25, 30, 50, 60, 120]`.

- [x] **Step 3: Add the rate**

In `app/utils/nd.ts`, change the `frameRates` line and extend its comment:

```ts
/** Frame rates offered as one-tap choices, and the seven ticks on the dial. */
export const frameRates = [24, 25, 30, 50, 60, 120, 240]
```

- [x] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/utils/nd.ts test/nd.spec.ts
git commit -m "feat: offer 240 fps, the seventh tick on the dial"
```

---

### Task 3: The slider and dial skins

**Files:**
- Modify: `app/assets/css/main.css` (append a new section before "Reduced motion")

**Interfaces:**
- Consumes: the `--color-*` tokens already defined in `@theme`.
- Produces: four classes used by Tasks 4 and 5: `.stop-slider`, `.dial-shell`,
  `.dial-ring-glow`, `.dial-title`.

There is no test for CSS. It is committed with the components that use it in
Tasks 4 and 5; this task only writes it.

- [x] **Step 1: Append the section**

Add to `app/assets/css/main.css`, immediately before the
`/* ----- Reduced motion ----- */` banner:

```css
/* ---------------------------------------------------------------------------
   ND tool: slider and dial
--------------------------------------------------------------------------- */

/* A native range input wearing LightKit's clothes.

   Native, rather than a hand-built slider, because the browser already does
   touch drag, pointer capture, keyboard steps and the "drag past the end and
   come back" case correctly. Every one of those is a thing a bespoke slider
   gets subtly wrong. The cost is four vendor pseudo-elements, written twice. */
.stop-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  /* The touch target, not the visible track. A 4px track alone would be a 4px
     hit area, and .tap cannot help an <input type="range">. */
  height: 28px;
  background: transparent;
  cursor: pointer;
}

.stop-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(34, 66, 69, 0.18);
}

.stop-slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(34, 66, 69, 0.18);
}

[data-theme="dark"] .stop-slider::-webkit-slider-runnable-track {
  background: rgba(255, 255, 255, 0.14);
}

[data-theme="dark"] .stop-slider::-moz-range-track {
  background: rgba(255, 255, 255, 0.14);
}

.stop-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  /* Half the thumb, less half the track, to sit it on the centre line. */
  margin-top: -9px;
  border-radius: 9999px;
  background: var(--color-brand-petrol-800);
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
}

.stop-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: var(--color-brand-petrol-800);
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
}

[data-theme="dark"] .stop-slider::-webkit-slider-thumb {
  background: var(--color-brand-glow);
  border-color: rgba(13, 22, 20, 0.9);
}

[data-theme="dark"] .stop-slider::-moz-range-thumb {
  background: var(--color-brand-glow);
  border-color: rgba(13, 22, 20, 0.9);
}

/* The dial's own box. `container-type: inline-size` turns on the cqw unit, so
   the filter name scales with the dial instead of needing a JavaScript
   measurement or a pile of breakpoints. */
.dial-shell {
  container-type: inline-size;
  touch-action: none;
}

/* The glow on the answer ring. A drop-shadow rather than a box-shadow: the
   ring is an SVG stroke, and box-shadow would draw a rectangle around it. */
.dial-ring-glow {
  filter: drop-shadow(0 0 5px rgba(66, 119, 123, 0.7));
}

[data-theme="dark"] .dial-ring-glow {
  filter: drop-shadow(0 0 8px rgba(143, 182, 214, 0.75));
}

/* The filter name in the middle of the dial. Josefin, because this is a
   display size and the string is a name rather than a changing figure - "ND32"
   is read as a word off a filter case, not as a number that ticks. */
.dial-title {
  font-family: var(--font-display);
  font-weight: 600;
  /* Sized against the ring's inner width, which is 43% of the container. The
     longest name is ND1000 at six characters; Task 8 checks it at 375px, the
     tightest screen the tool supports. */
  font-size: clamp(0.875rem, 12cqw, 2rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--color-brand-petrol-900);
}

[data-theme="dark"] .dial-title {
  color: var(--color-brand-glow);
}
```

- [x] **Step 2: Verify nothing regressed**

Run: `npm test`
Expected: PASS. CSS is not under test, but the suite must stay green.

- [x] **Step 3: Do not commit yet**

Leave this staged. It is committed with Task 4, which is the first thing that
uses it. A commit of unused CSS is a commit nobody can review.

---

### Task 4: `StopSlider.vue`

**Files:**
- Create: `app/components/nd/StopSlider.vue`

**Interfaces:**
- Consumes: `.stop-slider` from Task 3.
- Produces:
  ```ts
  defineProps<{
    modelValue: number
    items: { label: string }[]
    label: string
    offLabel?: string
  }>()
  defineEmits<{ 'update:modelValue': [number] }>()
  ```
  When `offLabel` is set, index `0` means "not set" and index `i` maps to
  `items[i - 1]`. When it is absent, index `i` maps to `items[i]`.

- [x] **Step 1: Write the component**

Create `app/components/nd/StopSlider.vue`:

```vue
<template>
  <div class="flex flex-col gap-0.5">
    <!-- .row-kv rather than flex justify-between: the caps label and the mono
         value are different faces at different sizes and must share a
         baseline, and the value must never wrap. -->
    <div class="row-kv">
      <span :id="labelId" class="t-label">{{ label }}</span>
      <span
        class="t-num font-semibold"
        :class="isOff ? 'text-ink-faint' : 'text-brand-petrol-800 dark:text-brand-glow'"
      >
        {{ currentLabel }}
      </span>
    </div>

    <input
      type="range"
      class="stop-slider"
      min="0"
      :max="max"
      step="1"
      :value="modelValue"
      :aria-labelledby="labelId"
      :aria-valuetext="currentLabel"
      @input="onInput"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * A native range input over a list of discrete stops, with the current value
 * printed beside its label.
 *
 * Native on purpose. A hand-built slider has to reimplement touch drag,
 * pointer capture, keyboard steps and dragging past the end, and gets at least
 * one of them wrong. The skin lives in `main.css` as `.stop-slider`.
 */
import { computed, useId } from 'vue'

const props = defineProps<{
  /** Index into the track. With `offLabel` set, 0 means "not set". */
  modelValue: number
  items: { label: string }[]
  label: string
  /**
   * Text for an extra "not set" position prepended to the track. The aperture
   * slider uses it, because many aircraft have a fixed iris and would
   * otherwise be handed advice they cannot follow.
   */
  offLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [number] }>()

const labelId = useId()

const offset = computed(() => (props.offLabel === undefined ? 0 : 1))
const max = computed(() => props.items.length - 1 + offset.value)
const isOff = computed(() => offset.value === 1 && props.modelValue === 0)

const currentLabel = computed(() => {
  if (isOff.value) return props.offLabel as string
  return props.items[props.modelValue - offset.value]?.label ?? '—'
})

const onInput = (event: Event) => {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}
</script>
```

- [x] **Step 2: Check it renders**

Run: `npm run dev`, open `http://localhost:4000/nd`.
Expected: the page is unchanged — nothing imports the component yet. This step
only confirms the dev server still boots and Vue reports no parse error. Stop
the server afterwards.

- [x] **Step 3: Run the tests**

Run: `npm test`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add app/assets/css/main.css app/components/nd/StopSlider.vue
git commit -m "feat: a stop slider, and the LightKit skin for a native range"
```

---

### Task 5: `FrameRateDial.vue`

**Files:**
- Create: `app/components/nd/FrameRateDial.vue`

**Interfaces:**
- Consumes: `.dial-shell`, `.dial-ring-glow`, `.dial-title` from Task 3.
- Produces:
  ```ts
  defineProps<{
    modelValue: number
    items: { label: string }[]
    centreTitle: string
    centreCaption: string
    dimmed?: boolean
    ariaLabel?: string
  }>()
  defineEmits<{ 'update:modelValue': [number] }>()
  ```

  **Deviation from the spec, section 5.1.** The spec gave items a second field,
  `sub`, holding each rate's shutter time, as the reference screenshot prints
  under every label. It is dropped. Seven two-line labels need the label radius
  pushed out far enough that the answer ring shrinks to under 40% of the
  container, at which point `ND1000` no longer fits inside it on a phone. The
  shutter time for the *selected* rate is already on the readout line under the
  dial, so nothing is lost. Dropping it also makes this item type identical to
  `StopSlider`'s.

**Geometry contract, so the numbers below are not magic.** Angles are degrees
from 12 o'clock, positive clockwise. A point at radius `r` and angle `a` is
`x = 100 + r*sin(a)`, `y = 100 - r*cos(a)`. The track runs from `-135` to `+135`,
a 270 degree sweep. For index `i` of `n`, `angle = -135 + (i / (n - 1)) * 270`.
The viewBox is `-14 -14 228 228` so labels at radius 98 have room and never clip.

- [x] **Step 1: Write the component**

Create `app/components/nd/FrameRateDial.vue`:

```vue
<template>
  <!-- aspect-square plus min-h-0 is what lets this shrink inside the flex
       column. Without min-h-0 on this element and every ancestor, a flex item
       refuses to go below its content size and the page grows a scrollbar. -->
  <div
    ref="rootEl"
    class="dial-shell relative aspect-square h-full max-w-full min-h-0 select-none"
    role="slider"
    tabindex="0"
    :aria-label="ariaLabel ?? 'Frame rate'"
    :aria-valuemin="0"
    :aria-valuemax="items.length - 1"
    :aria-valuenow="modelValue"
    :aria-valuetext="items[modelValue]?.label"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel.prevent="onWheel"
    @keydown="onKey"
  >
    <svg viewBox="-14 -14 228 228" class="w-full h-full">
      <!-- The track. One arc, large-arc-flag 1 because 270 degrees is more
           than a half turn, sweep-flag 1 because it runs clockwise. -->
      <path
        :d="trackPath"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
        class="text-brand-petrol-800/20 dark:text-brand-green-800/50"
      />

      <line
        v-for="(item, i) in items"
        :key="`tick-${item.label}`"
        :x1="pointAt(angleFor(i), i === modelValue ? 68 : 72).x"
        :y1="pointAt(angleFor(i), i === modelValue ? 68 : 72).y"
        :x2="pointAt(angleFor(i), i === modelValue ? 86 : 80).x"
        :y2="pointAt(angleFor(i), i === modelValue ? 86 : 80).y"
        :stroke-width="i === modelValue ? 3.5 : 1.5"
        stroke="currentColor"
        stroke-linecap="round"
        :class="i === modelValue
          ? 'text-brand-petrol-800 dark:text-brand-glow'
          : 'text-brand-petrol-800/30 dark:text-brand-green-800/70'"
      />

      <!-- Labels are dropped below 160px, where they would be under 8px tall.
           Nothing is lost: the readout line under the dial always names the
           current value. -->
      <template v-if="showLabels">
        <text
          v-for="(item, i) in items"
          :key="`label-${item.label}`"
          :x="pointAt(angleFor(i), 98).x"
          :y="pointAt(angleFor(i), 98).y"
          :text-anchor="anchorFor(angleFor(i))"
          dominant-baseline="middle"
          font-size="11"
          fill="currentColor"
          :class="i === modelValue
            ? 'text-brand-petrol-900 dark:text-brand-glow font-semibold'
            : 'text-ink-faint'"
        >{{ item.label }}</text>
      </template>

      <!-- The answer ring. -->
      <circle
        cx="100"
        cy="100"
        r="52"
        fill="none"
        stroke="currentColor"
        stroke-width="5"
        class="text-brand-petrol-700 dark:text-brand-glow transition-opacity duration-200"
        :class="dimmed ? 'opacity-25' : 'dial-ring-glow'"
      />
    </svg>

    <!-- The centre, as HTML rather than SVG text, so the type roles and the
         theme colours in main.css apply without being restated. -->
    <div class="absolute inset-0 grid place-items-center pointer-events-none">
      <!-- 42%, just inside the answer ring: its inner width is 99 of the 228
           viewBox units, which is 43.4%. -->
      <div class="flex flex-col items-center gap-1 text-center w-[42%]">
        <span class="dial-title truncate w-full">{{ centreTitle }}</span>
        <span v-if="showLabels" class="t-label-xs text-brand-petrol-800 dark:text-brand-glow">
          {{ centreCaption }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * A rotary selector over a short list, with a glowing ring in the middle that
 * shows something else entirely.
 *
 * The component knows nothing about ND filters or frame rates. It takes a list
 * and an index, and it emits an index. The centre is two strings the caller
 * supplies.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  modelValue: number
  items: { label: string }[]
  centreTitle: string
  centreCaption: string
  /** Grey the ring out, for when the target is not coming from this dial. */
  dimmed?: boolean
  ariaLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [number] }>()

const START = -135
const SWEEP = 270

/** Where index `i` sits on the track, in degrees from 12 o'clock. */
const angleFor = (i: number): number =>
  START + (i / Math.max(1, props.items.length - 1)) * SWEEP

/** Degrees from 12 o'clock, clockwise, to a point in the 200-unit viewBox. */
const pointAt = (angle: number, r: number): { x: number; y: number } => {
  const rad = (angle * Math.PI) / 180
  return { x: 100 + r * Math.sin(rad), y: 100 - r * Math.cos(rad) }
}

/** Labels read outward, so the side of the dial decides the anchor. */
const anchorFor = (angle: number): 'start' | 'middle' | 'end' => {
  const s = Math.sin((angle * Math.PI) / 180)
  if (s > 0.25) return 'start'
  if (s < -0.25) return 'end'
  return 'middle'
}

const trackPath = computed(() => {
  const a = pointAt(START, 76)
  const b = pointAt(START + SWEEP, 76)
  return `M ${a.x} ${a.y} A 76 76 0 1 1 ${b.x} ${b.y}`
})

const rootEl = ref<HTMLElement | null>(null)
const dragging = ref(false)

// --- input -----------------------------------------------------------------

const metrics = () => {
  const box = rootEl.value!.getBoundingClientRect()
  return {
    cx: box.left + box.width / 2,
    cy: box.top + box.height / 2,
    radius: Math.min(box.width, box.height) / 2
  }
}

const applyFromEvent = (event: PointerEvent) => {
  const { cx, cy } = metrics()
  const angle = (Math.atan2(event.clientX - cx, cy - event.clientY) * 180) / Math.PI
  const clamped = Math.min(START + SWEEP, Math.max(START, angle))
  const next = Math.round(((clamped - START) / SWEEP) * (props.items.length - 1))
  if (next !== props.modelValue) emit('update:modelValue', next)
}

const onPointerDown = (event: PointerEvent) => {
  if (!rootEl.value) return
  const { cx, cy, radius } = metrics()
  const fraction = Math.hypot(event.clientX - cx, event.clientY - cy) / radius

  // Only the outer ring grabs. A tap on the answer in the middle must not
  // spin the dial, and a tap outside the circle is not on the control at all.
  if (fraction < 0.62 || fraction > 1.05) return

  dragging.value = true
  rootEl.value.setPointerCapture(event.pointerId)
  applyFromEvent(event)
}

const onPointerMove = (event: PointerEvent) => {
  if (dragging.value) applyFromEvent(event)
}

const onPointerUp = (event: PointerEvent) => {
  if (!dragging.value) return
  dragging.value = false
  rootEl.value?.releasePointerCapture(event.pointerId)
}

const step = (delta: number) => {
  const next = Math.min(props.items.length - 1, Math.max(0, props.modelValue + delta))
  if (next !== props.modelValue) emit('update:modelValue', next)
}

const onWheel = (event: WheelEvent) => step(event.deltaY > 0 ? 1 : -1)

const onKey = (event: KeyboardEvent) => {
  const keys: Record<string, () => void> = {
    ArrowRight: () => step(1),
    ArrowUp: () => step(1),
    ArrowLeft: () => step(-1),
    ArrowDown: () => step(-1),
    Home: () => emit('update:modelValue', 0),
    End: () => emit('update:modelValue', props.items.length - 1)
  }
  const action = keys[event.key]
  if (!action) return
  event.preventDefault()
  action()
}

// --- size ------------------------------------------------------------------

const width = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!rootEl.value) return
  observer = new ResizeObserver((entries) => {
    width.value = entries[0]?.contentRect.width ?? 0
  })
  observer.observe(rootEl.value)
})

onUnmounted(() => observer?.disconnect())

const showLabels = computed(() => width.value >= 160)
</script>
```

- [x] **Step 2: Run the tests**

Run: `npm test`
Expected: PASS. The component holds geometry, not product arithmetic, and the
vitest environment stays `node`.

- [x] **Step 3: Commit**

```bash
git add app/components/nd/FrameRateDial.vue
git commit -m "feat: a rotary frame-rate dial with the answer in its middle"
```

---

### Task 6: The no-scroll viewport flag

**Files:**
- Modify: `app/layouts/default.vue:2-7`
- Modify: `app/pages/nd.vue`

**Interfaces:**
- Consumes: nothing.
- Produces: a page may declare `definePageMeta({ fitViewport: true })` and the
  shell will cap itself to `100svh` and hide overflow on every size.

- [x] **Step 1: Read the flag in the layout**

In `app/layouts/default.vue`, add to the `<script setup>` block, just under the
existing `activeTool` computed:

```ts
/**
 * Whether this page promises to fit the viewport, so the shell may cap its own
 * height and hide overflow on a phone as well as on a desktop.
 *
 * Route meta rather than a shared ref: fitting the screen is a fact about the
 * page, and meta travels with the URL. A ref the page wrote into the layout
 * would be a second source of truth, which is the trap AGENTS.md records for
 * the retired `dpt:active-app` key.
 *
 * `svh`, not `vh` or `dvh`. `svh` is the viewport height with the browser
 * chrome showing, so the layout is sized for its worst moment. `dvh` changes
 * as chrome retracts, which would resize the dial under the user's finger.
 */
const fitViewport = computed(() => route.meta.fitViewport === true)
```

- [x] **Step 2: Swap the shell classes**

Replace the two opening elements of the template:

```vue
  <div
    class="flex flex-col justify-between safe-inset"
    :class="fitViewport
      ? 'h-[100svh] max-h-[100svh] overflow-hidden'
      : 'min-h-[100svh] overflow-x-hidden lg:h-screen lg:max-h-screen lg:overflow-hidden'"
  >
    <BackgroundShader :isDark="isDark" />

    <div
      class="max-w-7xl w-full mx-auto grow flex flex-col justify-between gap-5 md:gap-6 min-h-0"
      :class="fitViewport
        ? 'h-full max-h-full overflow-hidden'
        : 'lg:h-full lg:max-h-full lg:overflow-hidden'"
    >
```

- [x] **Step 3: Set the flag on the ND page**

Replace the whole of `app/pages/nd.vue`:

```vue
<script setup lang="ts">
import NdFilters from '../components/NdFilters.vue'

// The ND tool is built to fit one screen: the dial takes whatever height the
// fixed rows leave it. Saying so here lets the shell cap itself and stop the
// page scrolling. The solar page never sets this, so its map is unaffected.
definePageMeta({ fitViewport: true })

useHead({ title: 'ND Filters // LightKit' })
</script>

<template>
  <div class="grow min-h-0 h-0 animate-panel">
    <ClientOnly>
      <NdFilters />
    </ClientOnly>
  </div>
</template>
```

Note `h-0` is no longer behind the `lg:` prefix. With `grow`, a zero basis makes
the element take exactly the space the flex parent has left, on every size —
which is the whole point of the flag.

- [x] **Step 4: Check both pages by hand**

Run: `npm run dev`, then:
- Open `http://localhost:4000/nd` at 390x844 in DevTools device mode. The page
  must not scroll. Content will still overflow at this point, because
  `NdFilters.vue` is not rebuilt until Task 7 — confirm only that the **shell**
  no longer grows past the viewport.
- Open `http://localhost:4000/solar`. It must still scroll exactly as before.

- [x] **Step 5: Run the tests and commit**

Run: `npm test`
Expected: PASS.

```bash
git add app/layouts/default.vue app/pages/nd.vue
git commit -m "feat: let a page promise to fit the viewport, and hold the shell to it"
```

---

### Task 7: Rebuild `NdFilters.vue`

**Files:**
- Create: `app/components/nd/OutcomeList.vue`
- Modify: `app/components/NdFilters.vue` (rewritten)

**Interfaces:**
- Consumes: `StopSlider` (Task 4), `FrameRateDial` (Task 5), `apertureTrim`,
  `apertures`, `apertureLabel` (Task 1), `frameRates` with 240 (Task 2), and the
  untouched `nd.ts` exports the current file already imports.
- Produces: nothing further tasks depend on.

**Why `OutcomeList.vue` exists:** the same list is rendered twice — inline in the
right column on `lg`, and inside an `InfoModal` on a phone. Duplicating the
`v-for` and its offset wording in one file would mean fixing every future change
in two places.

- [x] **Step 1: Move `describeOffset` into `nd.ts` first**

It is about to be needed by two components, so it belongs with the arithmetic.
This step comes before the new component, which imports it. Cut it out of
`NdFilters.vue` and append to `app/utils/nd.ts`:

```ts
/**
 * Split an offset into a number and its words, so a template can set the digits
 * in the mono stack.
 *
 * Josefin has no tabular figures, so a changing figure left in proportional
 * type slides sideways as it ticks - and these rows are right-aligned, which
 * makes the whole string move.
 *
 * Anything under a tenth of a stop reads as "spot on". No filter is that
 * accurate, and no aperture ring can be set that finely.
 */
export const describeOffset = (stops: number): { amount: string | null; words: string } => {
  const rounded = Math.round(Math.abs(stops) * 10) / 10
  if (rounded < 0.1) return { amount: null, words: 'spot on' }

  const unit = rounded === 1 ? 'stop' : 'stops'
  return {
    amount: rounded.toFixed(1),
    words: `${unit} ${stops < 0 ? 'short' : 'over'}`
  }
}
```

Add a test to `test/nd.spec.ts`, and add `describeOffset` to its import block:

```ts
describe('describeOffset', () => {
  it('calls anything under a tenth of a stop spot on', () => {
    expect(describeOffset(0.04)).toEqual({ amount: null, words: 'spot on' })
    expect(describeOffset(-0.04)).toEqual({ amount: null, words: 'spot on' })
  })

  it('says short when the filter is too weak', () => {
    expect(describeOffset(-0.3)).toEqual({ amount: '0.3', words: 'stops short' })
  })

  it('says over when the filter is too strong', () => {
    expect(describeOffset(1)).toEqual({ amount: '1.0', words: 'stop over' })
  })
})
```

Run: `npm test`
Expected: PASS, with three new cases. `NdFilters.vue` still compiles because it
is rewritten in step 3 — if the dev server is running it will error here, which
is expected and clears in step 3.

- [x] **Step 2: Extract the outcomes list**

Create `app/components/nd/OutcomeList.vue`:

```vue
<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex flex-col divide-y divide-brand-petrol-800/8 dark:divide-brand-green-800/25">
      <div v-for="outcome in outcomes" :key="outcome.filter.name" class="row-kv py-1.5">
        <span
          class="t-num-sm truncate"
          :class="isRecommended(outcome)
            ? 'font-semibold text-brand-petrol-800 dark:text-brand-glow'
            : 'text-ink'"
        >
          {{ outcome.filter.name }} &middot; {{ outcome.label }}
        </span>
        <span
          class="t-label-xs"
          :class="isRecommended(outcome) ? 'text-brand-petrol-800 dark:text-brand-glow' : 'text-ink-faint'"
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
 * What every filter would give, as a list. Rendered inline on a wide screen and
 * inside a dialog on a phone, which is why it is its own file.
 */
import { describeOffset } from '../../utils/nd'
import type { FilterOutcome } from '../../utils/nd'

defineProps<{
  outcomes: FilterOutcome[]
  isRecommended: (outcome: FilterOutcome) => boolean
  canNarrow: boolean
  showAll: boolean
  gearModel: string | undefined
  totalFilters: number
}>()

defineEmits<{ 'toggle-all': [] }>()
</script>
```

- [x] **Step 3: Rewrite `NdFilters.vue`**

Replace the whole file:

```vue
<template>
  <!-- Phone: one column that fills the height it is given, with the dial taking
       whatever the fixed rows leave. Desktop: the old two-column grid, inputs
       left and the outcomes table right. -->
  <div class="flex flex-col gap-3 h-full min-h-0 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-stretch">
    <div class="flex flex-col gap-3 min-h-0 grow lg:col-span-7">
      <!-- Gear. One row, label inline, because vertical space is the scarce
           thing on this screen. Rule 1: this changes no number. -->
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
        >
          <Info :size="14" :stroke-width="1.75" />
        </button>
      </div>

      <!-- The two readings. Both are things the pilot reads off the aircraft,
           which is why they sit together and above the dial. -->
      <div class="glass-panel px-3 py-2.5 rounded-xl shadow-sm flex flex-col gap-2 shrink-0">
        <StopSlider
          v-model="meteredIndex"
          :items="shutterSpeeds"
          label="You metered"
        />
        <StopSlider
          v-model="apertureIndex"
          :items="apertureItems"
          label="Aperture now"
          off-label="— not set"
        />
      </div>

      <!-- The dial. The only element allowed to grow or shrink. -->
      <div class="grow min-h-0 grid place-items-center py-1">
        <FrameRateDial
          v-model="frameRateIndex"
          :items="dialItems"
          :centre-title="ringTitle"
          :centre-caption="ringCaption"
          :dimmed="targetMode === 'time'"
          aria-label="Frame rate"
        />
      </div>

      <!-- Two lines, because the frame-rate readout and the aperture answer are
           different things and neither fits beside the other on a phone. -->
      <div class="flex flex-col gap-1 shrink-0">
        <div class="row-kv">
          <span class="t-label-xs flex items-baseline gap-1.5 normal-case">
            <span class="t-num-xs">{{ targetLabel }}</span>
            <span class="text-ink-faint">&middot;</span>
            <span class="t-num-xs">{{ shutterAngle }}&deg;</span>
            <button
              @click="targetInfoOpen = true"
              class="tap-sm -m-1 p-1 grid place-items-center rounded-full text-ink-faint hover:text-ink transition-colors cursor-pointer"
              aria-label="Change the shutter angle or set a fixed time"
            >
              <Info :size="13" :stroke-width="1.75" />
            </button>
          </span>
          <button
            @click="outcomesOpen = true"
            class="tap-sm t-label-xs text-ink-muted hover:text-ink transition-colors cursor-pointer lg:hidden"
          >
            All filters
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

    <!-- Desktop only: the outcomes table keeps its column. -->
    <div class="hidden lg:flex lg:flex-col lg:col-span-5 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
      <div class="glass-panel p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-2.5 grow">
        <h4 class="t-label">What each filter would give</h4>
        <OutcomeList v-bind="outcomeListProps" @toggle-all="showAllFilters = !showAllFilters" />
      </div>
    </div>

    <!-- Phone only: the same list, one tap away, as product rule 3 requires. -->
    <InfoModal v-model:open="outcomesOpen" title="What each filter would give">
      <OutcomeList v-bind="outcomeListProps" @toggle-all="showAllFilters = !showAllFilters" />
    </InfoModal>

    <InfoModal v-model:open="targetInfoOpen" title="Your target">
      <div class="flex flex-col gap-5">
        <p class="t-body-sm">
          A shutter angle is how much of each frame the shutter stays open. 180
          degrees is half the frame. That is the film convention and it looks
          natural. Smaller looks sharper, larger blurs more.
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
            Turning the dial goes back to a frame rate, so you cannot get stuck
            here.
          </p>
        </div>
      </div>
    </InfoModal>

    <InfoModal v-model:open="gearInfoOpen" title="Your gear">
      <div class="flex flex-col gap-4">
        <p class="t-body-sm">
          Picking your gear changes no number. It only narrows the filter list to
          the strengths sold for that model.
        </p>
        <p class="t-body-sm">
          Every other strength stays one tap away under &ldquo;show all&rdquo;,
          because other makers sell strengths your aircraft&rsquo;s own maker
          does not.
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
import { apertures, apertureLabel, apertureTrim } from '../utils/aperture'
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

const gearInfoOpen = ref(false)
const targetInfoOpen = ref(false)
const outcomesOpen = ref(false)

const metered = computed(
  () => shutterSpeeds[meteredIndex.value] ?? shutterSpeeds[DEFAULT_SPEED_INDEX]!
)

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

// Labels only. Each rate's shutter time is on the readout line under the dial
// for whichever rate is selected; printing all seven would need the label ring
// pushed out until the answer ring no longer holds "ND1000" on a phone.
const dialItems = frameRates.map(rate => ({ label: `${rate}` }))

/**
 * The dial's index, written back as a frame rate.
 *
 * Turning it always returns to 'rate' mode. A pilot who set a fixed time once
 * and forgot must never be stuck: touching the dial is the way out.
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

const ringTitle = computed(() => (needsMoreLight.value ? 'None' : match.value?.filter.name ?? '—'))

const ringCaption = computed(() =>
  needsMoreLight.value ? 'No filter needed' : 'Recommended filter'
)

// --- the aperture trim -----------------------------------------------------

const apertureItems = computed(() => apertures.map(f => ({ label: apertureLabel(f) })))

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
 * With an aperture set, it names the f-number to dial in. Without one it falls
 * back to the honest leftover in stops, which is what product rule 4 demands
 * and what the panel said before this rebuild.
 */
const trimLabel = computed(() => {
  if (needsMoreLight.value) return 'Your camera already meters slower'
  if (!trim.value) return 'Filter lands'
  return trim.value.clamped ? 'Beyond your lens' : 'Adjust aperture to'
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
```

- [x] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS.

- [x] **Step 5: Check it by hand**

Run: `npm run dev`, open `http://localhost:4000/nd`.

Confirm, in both themes:
- The dial turns by drag, by scroll wheel, and by arrow key once focused.
- Dragging inside the glowing ring does **not** turn the dial.
- The centre reads `ND32` at the default 1/250 s and 25 fps.
- Moving the aperture slider off `— not set` turns the second line from a stop
  count into an f-number.
- `All filters` opens the list on a narrow window and is hidden above `lg`.

- [x] **Step 6: Commit**

```bash
git add app/components/NdFilters.vue app/components/nd/OutcomeList.vue app/utils/nd.ts test/nd.spec.ts
git commit -m "feat: rebuild the ND panel around the dial, two sliders and an aperture trim"
```

---

### Task 8: Measure the fit, and tune it

**Files:**
- Modify: `app/components/NdFilters.vue` (only if the measurement demands it)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

The height budget in the spec is estimated from the markup, not measured. This
task replaces the estimate with a measurement and acts on it. Section 9 of the
spec names this as risk 1.

- [x] **Step 1: Measure**

Run `npm run dev` and open `http://localhost:4000/nd` in Chrome DevTools device
mode. At **375x667** and again at **390x844**, in both themes, run in the
console:

```js
const el = document.scrollingElement
console.log(el.scrollHeight, el.clientHeight, el.scrollHeight === el.clientHeight)
```

Expected: `true` at both sizes. Record the numbers.

- [x] **Step 2: Check the dial is still legible**

At 375x667, confirm:
- The dial has a diameter above roughly 110px.
- `ND1000` fits inside the ring without touching it. Force it by setting the
  metered speed to `1/8000 s` and the frame rate to `24`.
- The frame-rate labels have disappeared, as intended below 160px, and the ticks
  remain.

- [x] **Step 3: Apply the fallback only if step 1 printed `false`**

The spec's named fallback is to move the gear select into the ⓘ dialog, which
returns 44px plus a 12px gap. In `NdFilters.vue`, delete the gear `glass-panel`
row from the template, and move the `<select>` into the top of the existing
"Your gear" `InfoModal`. Add a small gear button beside the existing ⓘ in the
target readout line to open it.

Do **not** shrink the sliders or the type to make it fit. Both are already at
the minimum sizes `AGENTS.md` allows.

- [x] **Step 4: Re-measure**

Repeat step 1. Expected: `true` at both sizes.

- [x] **Step 5: Run the tests and commit**

Run: `npm test`
Expected: PASS.

```bash
git add -A
git commit -m "fix: hold the ND panel inside one phone screen"
```

If step 1 printed `true` first time and nothing changed, skip the commit and say
so in the report.

---

## Closing out

After Task 8, run the `fin-patch` skill. It bumps the patch version, writes the
`CHANGELOG.md` entry — this change **is** user-visible, so it needs one — and
commits. Do not push, merge or tag; that is the user's call.

---

## As built — measured 2026-08-16

Task 8 replaced the estimates. Chrome device emulation at `375x667x2` and
`390x844x2`, both themes:

| Measure | 375x667 | 390x844 |
|---|---|---|
| Vertical scroll | none | none |
| Horizontal scroll | none | none |
| Dial diameter | 179px | 356px |
| `.dial-title` size | 19.7px | 39.1px |
| `ND1000` against the ring | 74px in 86px | fits |
| Clipped ring labels | none | none |

**The gear-row fallback was not needed.** The estimate in spec section 6.2 put
the dial at 98px on a 375x667 phone; it measured 179px, because the header and
footer are smaller than the markup suggested. The gear select stays on screen.

Three numbers were tuned against the measurement rather than the estimate:

1. **viewBox `-20 -20 240 240`, labels at radius 92 then 96, font 10.** The
   first attempt, `-14 -14 228 228` with labels at 98, clipped "120" by four
   units on the right. Measured, not guessed: the label's right edge sat at
   x=218 against a viewBox edge of 214.
2. **Answer ring radius 52 to 62, stroke 5 to 4.** The ring's inner width is
   what the filter name has to fit inside. At radius 52 that was 80px on a
   small phone, and `ND1000` needs 74px at the *reduced* font — every name from
   `ND32` up overflowed at the original size.
3. **`.dial-title` at `clamp(0.8rem, 11cqw, 2.75rem)`.** `ND1000` measures
   1.44x `ND32`, not the 1.2x its character count implies, because Josefin's
   zero is wide, its one is narrow, and the face has no tabular figures.

A fourth change came out of looking at it: the centre caption now has its own
threshold, `width >= 260`, separate from the ring labels' `>= 160`. "Recommended
filter" wrapped to two lines inside a 179px dial and crowded the name it was
describing.

Interaction was verified by dispatching real pointer events: drag to the top
tick gives 50 fps, drag to the right gives 120 fps, a tap at 0.2 of the radius
leaves the dial untouched, and ArrowLeft steps one rate down. The aperture trim
was checked at f/1.4, f/2.8, f/5.6 and f/22 — the last clamps and says "Beyond
your lens" rather than printing an f-number no lens has.
