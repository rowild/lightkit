# ND Gear Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> [!CAUTION]
> **Tasks 2–6 in this document are obsolete. Do not implement them.**
> Their "filtered ND grid" and `ndStops`-per-camera approach break the product
> rules that now govern this app. They are kept only as historical design
> context. A fresh plan supersedes them:
> [2026-08-16-nd-required-strength.md](./2026-08-16-nd-required-strength.md).
>
> The rules themselves moved out of this file on 2026-08-16 and now live in
> **[AGENTS.md](../../../AGENTS.md), section "ND tool product rules"**, which
> every session loads automatically. One clause was loosened in the move: "must
> not hide strengths" became "no strength may become unreachable", so filters
> outside the selected model's set may start collapsed behind a one-tap
> "show all". Change the rules there, not here.

**Corrected goal:** Let a user optionally choose a verified ND-capable camera or
drone from `Common`, then calculate the required ND strength from the measured
unfiltered exposure and desired shutter time (or frame rate plus shutter angle).
Camera selection is not a mathematical input.

**Architecture:** Pure exposure logic moves out of the single-file component into `app/utils/nd.ts` so it can be unit tested without a DOM. Gear data lives in one flat file, `app/data/gear.ts`, holding both a verified preset list and an explicit unverified list. `NdFilters.vue` keeps only presentation and reorders itself mobile-first with `display: contents` on its column wrappers.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, Tailwind CSS v4, Vitest (new in this plan).

**Spec:** This document. The design was agreed in conversation on 2026-08-16; its decisions are recorded in "Design Decisions" below rather than in a separate spec file, because the feature touches one component and one new data module.

---

## Status

Updated 2026-08-16.

| Task | State |
|---|---|
| 1. Vitest and the pure exposure module | **Done** — branch `feat/nd-exposure-module-and-vitest`, commits `9bd2bb1..667e4aa`. 17/17 tests pass, build clean. |
| 2. The gear data layer | **Obsolete specification — replan required** |
| 3. Research and populate the gear list | **Obsolete specification — use ND-capability evidence only** |
| 4. The gear picker and the filtered ND grid | **Obsolete — filtered grid explicitly rejected** |
| 5. The "model not listed" disclosure | **Replan with the corrected picker** |
| 6. The mobile-first reorder | **Re-evaluate after the corrected workflow is designed** |

Tasks 2 to 6 stay written out in full, below the "Deferred" banner. None of them
is started. [BACKLOG.md](../../../BACKLOG.md) points at this file so the deferred
work stays findable from the place backlog items are browsed.

Task 1 stands alone: it is a refactor plus a test runner, it changes no
behaviour a user can see apart from the two fixes listed under "Decisions Taken
Without Being Asked", and the app ships fine if the rest is never built.

---

## Global Constraints

Copied from [AGENTS.md](../../../AGENTS.md) and the agreed design. Every task's requirements implicitly include this section.

- **Node.js 24.11.0 or later** in the Node 24 LTS line or newer.
- **Tailwind v4 colour steps only**: 50, 100, 200 … 900, 950. An invented step such as `gray-550` generates no CSS and silently falls back to the inherited colour.
- **Prefer the ink tokens** `--color-ink`, `--color-ink-muted`, `--color-ink-faint` over raw grey steps. Prefer `--color-brand-glow-amber` / `--color-brand-glow-cyan` over raw accent colours.
- **`--font-caps` (`.t-label`, `.t-label-xs`, `.t-title`) is for UPPERCASE ONLY.** It has `descent-override: 0%`, so `g j p q y` hang outside the line box in lowercase.
- **Monospace is for digits that tick or align in a column only.** Static facts such as `f/2.8–f/11` are prose and use Josefin.
- **Type roles, not raw size utilities**: `.t-label` 12px caps, `.t-label-xs` 11px caps, `.t-title` 14px caps, `.t-body` 15px, `.t-body-sm` 14px, `.t-num-sm` 13px, `.t-num-xs` 11px, `.t-hero-num` clamp 28–40px.
- **Hit areas**: `.tap` (44px) and `.tap-sm` (38px). They apply only under `pointer: coarse`, so desktop density is unaffected.
- **Rows mixing font sizes or families use `items-baseline`, never `items-center`.**
- **Persisted state** uses `usePersistedRef(key, fallback)` from `app/composables/usePersistedRef.ts`. Keys are namespaced `dpt:` automatically. **The restore runs on mount, never during setup.**
- **Mobile first.** Every layout decision is verified at **390px** wide before 1440px.
- **Every gear entry carries a verifiable `source` URL.** A model whose ND filter set cannot be confirmed goes in `unverifiedGear`, never in `gearPresets` with a guessed value.

---

## Decisions Taken Without Being Asked

Three choices in this plan go past what was requested. Recorded here at the
user's request on 2026-08-16, each with its effect and how to reverse it, so
none of them turns into a surprise months from now.

| # | Decision | Effect a user can see | Where | To reverse |
|---|---|---|---|---|
| **A** | The exposure arithmetic moves out of `NdFilters.vue` into `app/utils/nd.ts` | None. Pure refactor. | Task 1 | Paste the module's contents back into the component's `<script setup>` and delete `app/utils/nd.ts` and `test/nd.spec.ts`. |
| **B** | `formatExposure` gains an hours branch | Exposures of an hour or more read `8h 32m` instead of `512m 0s`. Only reachable with a slow base shutter and a strong filter. | Task 1 | Delete the `seconds < 3600` guard and the final hours block in `formatExposure`, and drop the `renders one hour and over` test. |
| **C** | `snapStopsToAvailable` resolves an exact tie towards the **stronger** filter | With gear offering ND8 and ND32, a stored ND16 becomes ND32, not ND8. Too weak leaves the shutter too fast and the motion choppy; too strong only adds blur. | Task 4 (function written in Task 1) | Change `candidateDistance <= bestDistance` to `<` in `snapStopsToAvailable`, and flip the `breaks an exact tie` test to expect `3`. |

Decision C ships in Task 1 as a tested but unused function. Nothing calls it
until Task 4, so it changes no behaviour while the rest stays deferred.

---

## Design Decisions

Recorded so a fresh reader does not re-litigate them.

1. **Why extract `app/utils/nd.ts`.** `NdFilters.vue` imports `usePersistedRef`, which reads `import.meta.client` and `onMounted`. Testing the arithmetic through the component would drag in a DOM environment and Nuxt's build-time `import.meta` handling for no benefit. Pure functions in a plain module test in a `node` environment in milliseconds.

2. **Why a computed `effectiveStops` instead of a watcher.** Both `selectedStops` and the gear id are `usePersistedRef`s, and each restores in its own `onMounted` callback. Callbacks fire in declaration order, so a watcher that snaps the filter when the gear changes would run against a not-yet-restored filter value and then be overwritten. A computed that snaps at read time has no ordering dependency at all. It also makes returning to a previous gear restore the filter you originally had.

3. **Tie-break goes to the stronger filter.** When a requested strength sits exactly between two available ones, `snapStopsToAvailable` picks the higher stop count. A weaker-than-needed filter leaves the shutter too fast and the footage choppy; a stronger one only adds motion blur. Blur is the safer error.

4. **A native `<select>` with `<optgroup>`, not a custom list.** The list will hold 30+ models. On a phone a native select opens the OS picker, which is scrollable, searchable by keystroke, screen-reader correct, and costs no JavaScript. It also matches the existing shutter-speed control in the same panel.

5. **`display: contents` for the mobile reorder.** Below `lg` the two column wrappers generate no box, so all five cards become direct flex children of the root and `order-*` can interleave them across columns. At `lg` the wrappers become flex columns again and `lg:order-0` restores DOM order. The wrappers are plain `<div>`s with no ARIA role, so the historical `display: contents` accessibility bug does not apply. [app.vue:50-53](../../../app/app.vue#L50-L53) already uses a mobile-first reorder, so this follows the house pattern.

6. **Hours in the long-exposure label.** The current formatter renders 30720 s as `512m 0s`. Task 1 writes a test for this value, and enshrining a bad output in a test is worse than fixing it, so the formatter gains an hours branch. This is the only behaviour change outside the stated scope.

**Explicitly out of scope** (agreed deferred, formerly "Option A"): the frame-rate input, the reverse "which ND do I need?" mode, snapping the result to real camera shutter values (the `1/63 s` problem), and the incorrect "Middle-ground exposure" advice text. Do not fix these here.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `app/utils/nd.ts` | create | Shutter table, ND table, exposure arithmetic, formatting, filter snapping. No Vue, no browser APIs. |
| `app/data/gear.ts` | create | `gearPresets`, `unverifiedGear`, lookup and grouping helpers. Data and pure helpers only. |
| `app/components/NdFilters.vue` | modify | Presentation only. Gear picker, facts strip, filtered ND grid, unverified disclosure, mobile order. |
| `test/nd.spec.ts` | create | Unit tests for `app/utils/nd.ts`. |
| `test/gear.spec.ts` | create | Schema and integrity tests for `app/data/gear.ts`. |
| `vitest.config.ts` | create | Vitest config, `node` environment, `~` alias to `app/`. |
| `package.json` | modify | `vitest` devDependency, `test` and `test:watch` scripts. |
| `AGENTS.md` | modify | New persisted key, gear data rules, `display: contents` note. |
| `README.md` | modify | Feature bullet, test scripts. |
| `BACKLOG.md` | modify | Non-drone camera support entry. |

---

## Task 1: Vitest and the pure exposure module

Extract the arithmetic out of the component, put a test runner behind it, and leave the component's behaviour unchanged.

**Files:**
- Create: `vitest.config.ts`
- Create: `app/utils/nd.ts`
- Create: `test/nd.spec.ts`
- Modify: `package.json`
- Modify: `app/components/NdFilters.vue:131-228` (script block: import the module instead of declaring the tables and arithmetic inline)
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface ShutterSpeed { value: number; label: string }`
  - `const shutterSpeeds: ShutterSpeed[]`
  - `interface NdFilter { name: string; stops: number }`
  - `const ndFilters: NdFilter[]`
  - `interface CalculatedExposure { seconds: number; label: string; mathLabel: string }`
  - `formatExposure(seconds: number): { label: string; mathLabel: string }`
  - `calculateExposure(baseSeconds: number, stops: number): CalculatedExposure`
  - `snapStopsToAvailable(stops: number, available: number[]): number`
  - `getSpeedIndex(value: number): number`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Add the test scripts**

In `package.json`, inside `"scripts"`, add these two entries after `"preview"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts` at the repository root:

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// The modules under test are plain TypeScript with no Vue, no Nuxt and no
// browser APIs, so the `node` environment is enough. Adding happy-dom or
// @nuxt/test-utils would slow every run down for behaviour nothing here uses.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts']
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})
```

- [ ] **Step 4: Write the failing tests**

Create `test/nd.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  shutterSpeeds,
  ndFilters,
  formatExposure,
  calculateExposure,
  snapStopsToAvailable,
  getSpeedIndex
} from '~/utils/nd'

describe('shutterSpeeds', () => {
  it('runs from fastest to slowest', () => {
    const values = shutterSpeeds.map(s => s.value)
    const sorted = [...values].sort((a, b) => a - b)
    expect(values).toEqual(sorted)
  })

  it('gives every entry a label ending in " s"', () => {
    for (const speed of shutterSpeeds) {
      expect(speed.label.endsWith(' s')).toBe(true)
    }
  })
})

describe('ndFilters', () => {
  it('covers one to ten stops with no gaps', () => {
    expect(ndFilters.map(f => f.stops)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('names each filter after its light-blocking factor', () => {
    for (const filter of ndFilters) {
      expect(filter.name).toBe(`ND${Math.pow(2, filter.stops)}`)
    }
  })
})

describe('formatExposure', () => {
  it('renders sub-second times as a reciprocal', () => {
    expect(formatExposure(1 / 250)).toEqual({ label: '1/250 s', mathLabel: '1/250s' })
  })

  it('renders seconds with one decimal', () => {
    expect(formatExposure(2)).toEqual({ label: '2.0 s', mathLabel: '2.0s' })
  })

  it('renders one minute and over as minutes and seconds', () => {
    expect(formatExposure(90)).toEqual({ label: '1m 30s', mathLabel: '1m 30s' })
  })

  it('renders one hour and over as hours and minutes', () => {
    // 30 s base through a ten-stop filter is the slowest result the app can
    // produce. "512m 0s" is not a time anyone reads off a screen.
    expect(formatExposure(30720)).toEqual({ label: '8h 32m', mathLabel: '8h 32m' })
  })
})

describe('calculateExposure', () => {
  it('doubles the exposure time for every stop', () => {
    expect(calculateExposure(1 / 1000, 3).seconds).toBeCloseTo(1 / 125, 10)
  })

  it('returns the formatted labels alongside the raw seconds', () => {
    const result = calculateExposure(1 / 2000, 3)
    expect(result.label).toBe('1/250 s')
    expect(result.mathLabel).toBe('1/250s')
  })

  it('treats zero stops as no change', () => {
    expect(calculateExposure(1 / 60, 0).seconds).toBeCloseTo(1 / 60, 10)
  })
})

describe('snapStopsToAvailable', () => {
  it('keeps the choice when it is available', () => {
    expect(snapStopsToAvailable(4, [3, 4, 5, 6])).toBe(4)
  })

  it('moves to the nearest available strength', () => {
    expect(snapStopsToAvailable(9, [3, 4, 5, 6])).toBe(6)
    expect(snapStopsToAvailable(1, [3, 4, 5, 6])).toBe(3)
  })

  it('breaks an exact tie towards the stronger filter', () => {
    // Too weak leaves the shutter too fast and the footage choppy. Too strong
    // only adds motion blur. Blur is the safer error.
    expect(snapStopsToAvailable(4, [3, 5])).toBe(5)
  })

  it('returns the choice unchanged when nothing is available', () => {
    expect(snapStopsToAvailable(4, [])).toBe(4)
  })
})

describe('getSpeedIndex', () => {
  it('finds an exact shutter value', () => {
    expect(shutterSpeeds[getSpeedIndex(1 / 250)]!.label).toBe('1/250 s')
  })

  it('falls back to 1/250 s for an unknown value', () => {
    expect(shutterSpeeds[getSpeedIndex(1 / 3)]!.label).toBe('1/250 s')
  })
})
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "~/utils/nd"`.

- [ ] **Step 6: Write the module**

Create `app/utils/nd.ts`:

```ts
/**
 * Exposure arithmetic for the ND filter tool.
 *
 * Deliberately free of Vue, Nuxt and browser APIs so it can be unit tested in
 * a plain node environment.
 */

export interface ShutterSpeed {
  /** Exposure time in seconds. */
  value: number
  label: string
}

/** The full-stop shutter series, fastest first. */
export const shutterSpeeds: ShutterSpeed[] = [
  { value: 1 / 8000, label: '1/8000 s' },
  { value: 1 / 4000, label: '1/4000 s' },
  { value: 1 / 2000, label: '1/2000 s' },
  { value: 1 / 1000, label: '1/1000 s' },
  { value: 1 / 500, label: '1/500 s' },
  { value: 1 / 250, label: '1/250 s' },
  { value: 1 / 125, label: '1/125 s' },
  { value: 1 / 60, label: '1/60 s' },
  { value: 1 / 30, label: '1/30 s' },
  { value: 1 / 15, label: '1/15 s' },
  { value: 1 / 8, label: '1/8 s' },
  { value: 1 / 4, label: '1/4 s' },
  { value: 1 / 2, label: '1/2 s' },
  { value: 1.0, label: '1.0 s' },
  { value: 2.0, label: '2.0 s' },
  { value: 4.0, label: '4.0 s' },
  { value: 8.0, label: '8.0 s' },
  { value: 15.0, label: '15.0 s' },
  { value: 30.0, label: '30.0 s' }
]

/** Index of the default base shutter, 1/250 s. */
export const DEFAULT_SPEED_INDEX = 5

export interface NdFilter {
  name: string
  /** Stops of light the filter blocks. The factor is 2 ** stops. */
  stops: number
}

export const ndFilters: NdFilter[] = Array.from({ length: 10 }, (_, i) => ({
  stops: i + 1,
  name: `ND${Math.pow(2, i + 1)}`
}))

export interface CalculatedExposure {
  /** Exposure time in seconds. */
  seconds: number
  /** Label for the hero readout, e.g. "1/250 s". */
  label: string
  /** Compact label for the inline formula, e.g. "1/250s". */
  mathLabel: string
}

/**
 * Turn an exposure time into the two labels the panel shows.
 *
 * Times of an hour or more appear as hours and minutes. The slowest result the
 * app can produce is 30 s through ten stops, which is 8h 32m; rendering that as
 * "512m 0s" is technically right and useless.
 */
export const formatExposure = (seconds: number): { label: string; mathLabel: string } => {
  if (seconds < 1) {
    const reciprocal = Math.round(1 / seconds)
    return { label: `1/${reciprocal} s`, mathLabel: `1/${reciprocal}s` }
  }

  if (seconds < 60) {
    return { label: `${seconds.toFixed(1)} s`, mathLabel: `${seconds.toFixed(1)}s` }
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const rest = Math.round(seconds % 60)
    const text = `${minutes}m ${rest}s`
    return { label: text, mathLabel: text }
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  const text = `${hours}h ${minutes}m`
  return { label: text, mathLabel: text }
}

/** Apply an ND filter of `stops` strength to a base exposure time. */
export const calculateExposure = (baseSeconds: number, stops: number): CalculatedExposure => {
  const seconds = baseSeconds * Math.pow(2, stops)
  return { seconds, ...formatExposure(seconds) }
}

/**
 * Move a filter choice onto the nearest strength the selected gear offers.
 *
 * An exact tie resolves upwards, towards the stronger filter: too weak leaves
 * the shutter too fast and the motion choppy, while too strong only adds blur.
 */
export const snapStopsToAvailable = (stops: number, available: number[]): number => {
  if (available.length === 0) return stops
  if (available.includes(stops)) return stops

  return available.reduce((best, candidate) => {
    const candidateDistance = Math.abs(candidate - stops)
    const bestDistance = Math.abs(best - stops)
    return candidateDistance <= bestDistance ? candidate : best
  })
}

/** Look up a shutter index by value, falling back to 1/250 s. */
export const getSpeedIndex = (value: number): number => {
  const index = shutterSpeeds.findIndex(s => Math.abs(s.value - value) < 0.0001)
  return index === -1 ? DEFAULT_SPEED_INDEX : index
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 17 tests.

Note on the tie-break test: `available.reduce` seeds with the first element, so `snapStopsToAvailable(4, [3, 5])` compares `5` against `3` with `1 <= 1`, which is true, giving `5`. If this test fails with `3`, the comparison was written as `<` rather than `<=`.

- [ ] **Step 8: Point the component at the module**

In `app/components/NdFilters.vue`, replace the whole `<script setup>` block from line 131 to line 272 with:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePersistedRef } from '../composables/usePersistedRef'
import {
  shutterSpeeds,
  ndFilters,
  calculateExposure,
  getSpeedIndex,
  DEFAULT_SPEED_INDEX
} from '../utils/nd'

// Common metering points, offered as one-tap shortcuts next to the full list.
const quickPicks = [
  { label: '1/1000', value: 1 / 1000 },
  { label: '1/250', value: 1 / 250 },
  { label: '1/60', value: 1 / 60 }
]

// Both remembered: a pilot flies the same rig repeatedly and should not have to
// re-pick their filter on every visit.
const selectedBaseIndex = usePersistedRef('nd-base-index', DEFAULT_SPEED_INDEX)
const selectedStops = usePersistedRef('nd-stops', 3) // ND8

const baseSpeed = computed(
  () => shutterSpeeds[selectedBaseIndex.value] ?? shutterSpeeds[DEFAULT_SPEED_INDEX]!
)

const calculatedSpeed = computed(() =>
  calculateExposure(baseSpeed.value.value, selectedStops.value)
)

const ndFactor = computed(() => Math.pow(2, selectedStops.value))

// Motion blur guidance. The rating is split into a heading and a body so the
// heading can carry the colour and the body can stay plain, readable prose.
type Advice = { title: string; text: string; color: string }

const advice = computed<Advice>(() => {
  const speed = calculatedSpeed.value.seconds

  // The 180-degree shutter rule: roughly 1/40 - 1/125 at 24-30fps.
  if (speed >= 1 / 125 && speed <= 1 / 40) {
    return {
      title: 'Cinematic motion blur',
      text: 'This matches the 180-degree shutter rule for 24 and 30 fps filming. Motion looks natural and smooth.',
      color: 'text-brand-petrol-700 dark:text-brand-glow'
    }
  }

  if (speed > 0.5) {
    return {
      title: 'Long exposure',
      text: 'Good for smoothing water or drawing light trails. Hold the drone completely still, or the whole frame will blur.',
      color: 'text-brand-glow-amber'
    }
  }

  if (speed < 1 / 125) {
    return {
      title: 'Shutter too fast',
      text: 'Motion will look choppy and stuttery in video. Fit a stronger filter, such as ND32 or ND64.',
      color: 'text-red-700 dark:text-red-400'
    }
  }

  return {
    title: 'Middle-ground exposure',
    text: 'Between cinematic and fast. Suits high-speed tracking shots and clean landscape stills.',
    color: 'text-brand-petrol-700 dark:text-brand-glow'
  }
})

const adviceColor = computed(() => advice.value.color)
const adviceTitle = computed(() => advice.value.title)
const adviceText = computed(() => advice.value.text)
</script>
```

The advice text is copied unchanged. Its known problems are out of scope for this plan.

- [ ] **Step 9: Update the three template references the rename touched**

In the same file's template:

Line 42 — `presets` became `quickPicks`:

```vue
              v-for="preset in quickPicks"
```

Lines 109-113 — the formula row now reads from the guarded computeds. Replace the two spans that referenced `shutterSpeeds[selectedBaseIndex]` and `Math.pow(...)`:

```vue
          <span class="t-num-sm text-ink-muted">{{ baseSpeed.label }}</span>
          <span class="t-num-sm text-ink-faint">&times;</span>
          <span class="t-num-sm text-ink-muted">{{ ndFactor }}&times;</span>
```

This removes the unguarded array index that would break the render if `localStorage` held an out-of-range value.

- [ ] **Step 10: Verify the app still builds and behaves**

Run: `npm run build`
Expected: build succeeds with no type errors.

Run: `npm run dev`, open http://localhost:4000, switch to the ND tab.
Expected: picking 1/1000 s and ND8 shows `1/125 s`, and the formula row reads `1/1000 s × 8× = 1/125s`.

- [ ] **Step 11: Document the scripts**

In `README.md`, under the `## npm scripts` fenced block, add:

```bash
# Run the unit tests once
npm test

# Run the unit tests in watch mode
npm run test:watch
```

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json vitest.config.ts app/utils/nd.ts test/nd.spec.ts app/components/NdFilters.vue README.md
git commit -m "refactor: extract ND exposure logic and add Vitest

Moves the shutter table, ND table and exposure arithmetic out of
NdFilters.vue into app/utils/nd.ts so they can be tested without a DOM.
Adds Vitest with a node environment and 17 unit tests.

Also removes an unguarded array index in the formula row that would
break the render if localStorage held an out-of-range shutter index,
and renders exposures of an hour or more as hours and minutes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# DEFERRED — DO NOT BUILD YET

**Everything below this line is written but not scheduled.** Tasks 2 to 6 stay
here in full so the thinking is not lost and a later session can pick any of
them up without redesigning. Do not start one without asking first.

**Superseded on 2026-08-16:** Do not execute Tasks 2–6 as written. In
particular, do not add `GearPreset.ndStops`, do not call
`snapStopsToAvailable` from the gear picker, and do not filter the ND grid.
Write a replacement plan from the corrected goal and caution above first.

Task 3 in particular is a long research grind across many makers' product
pages. It is the reason the rest is held back: it does not belong in the same
session as a refactor.

---

## Task 2: The gear data layer

Define the shape of a gear preset and the shape of a model we could not verify, with tests that guard both. Seed the file with two entries the user owns, so the shape is exercised before the bulk research.

**Files:**
- Create: `app/data/gear.ts`
- Create: `test/gear.spec.ts`
- Modify: `BACKLOG.md`

**Interfaces:**
- Consumes: `ndFilters` from `app/utils/nd.ts` (Task 1), for the integrity test that every declared stop is a real filter.
- Produces:
  - `interface GearPreset { id: string; brand: string; name: string; ndStops: number[]; facts: string[]; filterSource: 'first-party' | 'third-party'; source: string }`
  - `interface UnverifiedGear { brand: string; name: string; reason: string; checked: string }`
  - `const ANY_GEAR_ID = 'any'`
  - `const gearPresets: GearPreset[]`
  - `const unverifiedGear: UnverifiedGear[]`
  - `findGear(id: string): GearPreset | undefined`
  - `interface GearGroup { brand: string; models: GearPreset[] }`
  - `gearGroups(): GearGroup[]`

- [ ] **Step 1: Write the failing tests**

Create `test/gear.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ndFilters } from '~/utils/nd'
import {
  ANY_GEAR_ID,
  gearPresets,
  unverifiedGear,
  findGear,
  gearGroups
} from '~/data/gear'

const knownStops = ndFilters.map(f => f.stops)

describe('gearPresets', () => {
  it('is not empty', () => {
    expect(gearPresets.length).toBeGreaterThan(0)
  })

  it('gives every model a unique id', () => {
    const ids = gearPresets.map(g => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never uses the reserved "any" id', () => {
    expect(gearPresets.some(g => g.id === ANY_GEAR_ID)).toBe(false)
  })

  it('uses kebab-case ids', () => {
    for (const gear of gearPresets) {
      expect(gear.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('lists at least one filter for every model', () => {
    for (const gear of gearPresets) {
      expect(gear.ndStops.length).toBeGreaterThan(0)
    }
  })

  it('only lists filters the app knows about', () => {
    for (const gear of gearPresets) {
      for (const stop of gear.ndStops) {
        expect(knownStops).toContain(stop)
      }
    }
  })

  it('keeps every filter list sorted and free of duplicates', () => {
    for (const gear of gearPresets) {
      const sorted = [...gear.ndStops].sort((a, b) => a - b)
      expect(gear.ndStops).toEqual(sorted)
      expect(new Set(gear.ndStops).size).toBe(gear.ndStops.length)
    }
  })

  it('gives every model at least one fact', () => {
    for (const gear of gearPresets) {
      expect(gear.facts.length).toBeGreaterThan(0)
      for (const fact of gear.facts) {
        expect(fact.trim()).not.toBe('')
      }
    }
  })

  it('cites a checkable https source for every model', () => {
    for (const gear of gearPresets) {
      expect(gear.source).toMatch(/^https:\/\//)
    }
  })

  it('states whether the filter set is first or third party', () => {
    for (const gear of gearPresets) {
      expect(['first-party', 'third-party']).toContain(gear.filterSource)
    }
  })
})

describe('unverifiedGear', () => {
  it('gives every entry a brand, a name and a reason', () => {
    for (const item of unverifiedGear) {
      expect(item.brand.trim()).not.toBe('')
      expect(item.name.trim()).not.toBe('')
      expect(item.reason.trim()).not.toBe('')
    }
  })

  it('records an ISO date for when it was checked', () => {
    for (const item of unverifiedGear) {
      expect(item.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('never repeats a model that is already verified', () => {
    const verified = new Set(gearPresets.map(g => `${g.brand} ${g.name}`))
    for (const item of unverifiedGear) {
      expect(verified.has(`${item.brand} ${item.name}`)).toBe(false)
    }
  })
})

describe('findGear', () => {
  it('finds a model by id', () => {
    const first = gearPresets[0]!
    expect(findGear(first.id)).toEqual(first)
  })

  it('returns undefined for the "any" id', () => {
    expect(findGear(ANY_GEAR_ID)).toBeUndefined()
  })

  it('returns undefined for an unknown id', () => {
    expect(findGear('no-such-drone')).toBeUndefined()
  })
})

describe('gearGroups', () => {
  it('groups every model under its brand exactly once', () => {
    const groups = gearGroups()
    const flattened = groups.flatMap(g => g.models)
    expect(flattened.length).toBe(gearPresets.length)
    expect(new Set(groups.map(g => g.brand)).size).toBe(groups.length)
  })

  it('sorts brands alphabetically', () => {
    const brands = gearGroups().map(g => g.brand)
    expect(brands).toEqual([...brands].sort((a, b) => a.localeCompare(b)))
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "~/data/gear"`.

- [ ] **Step 3: Write the data module with two seed entries**

Create `app/data/gear.ts`. Replace the two `source` URLs with the real product pages found during the check; do not ship a placeholder.

```ts
/**
 * Camera gear the ND tool knows about.
 *
 * Rule: a model only appears in `gearPresets` if its ND filter set was read off
 * a real product page, cited in `source`. A model whose set could not be
 * confirmed goes in `unverifiedGear` with a reason, so the gap stays visible
 * instead of turning into a guess.
 */

export interface GearPreset {
  /** Stable kebab-case id. Persisted, so never rename one in place. */
  id: string
  brand: string
  name: string
  /** ND strengths available for this model, in stops, ascending. */
  ndStops: number[]
  /** Short read-only optical facts, rendered as one wrapping line. */
  facts: string[]
  filterSource: 'first-party' | 'third-party'
  /** Page the ndStops list was read from. */
  source: string
}

export interface UnverifiedGear {
  brand: string
  name: string
  /** Why it is not in the list yet, in one plain sentence. */
  reason: string
  /** ISO date of the check, so a stale entry is obvious. */
  checked: string
}

/** Sentinel id for "no gear selected", which shows every filter. */
export const ANY_GEAR_ID = 'any'

export const gearPresets: GearPreset[] = [
  {
    id: 'dji-mavic-3-pro',
    brand: 'DJI',
    name: 'Mavic 3 Pro',
    ndStops: [3, 4, 5, 6],
    facts: ['24mm f/2.8–f/11', '70mm f/2.8', '166mm f/3.4', '24–120 fps'],
    filterSource: 'first-party',
    source: 'https://REPLACE-WITH-VERIFIED-DJI-PRODUCT-PAGE'
  },
  {
    id: 'dji-avata-2',
    brand: 'DJI',
    name: 'Avata 2',
    ndStops: [3, 4, 5],
    facts: ['12mm equiv. f/2.8 fixed', '24–100 fps'],
    filterSource: 'first-party',
    source: 'https://REPLACE-WITH-VERIFIED-DJI-PRODUCT-PAGE'
  }
]

export const unverifiedGear: UnverifiedGear[] = []

/** Look up a preset. Returns undefined for `ANY_GEAR_ID` and unknown ids. */
export const findGear = (id: string): GearPreset | undefined =>
  gearPresets.find(gear => gear.id === id)

export interface GearGroup {
  brand: string
  models: GearPreset[]
}

/** Group the presets by brand for an <optgroup> list, brands A to Z. */
export const gearGroups = (): GearGroup[] => {
  const byBrand = new Map<string, GearPreset[]>()

  for (const gear of gearPresets) {
    const models = byBrand.get(gear.brand)
    if (models) models.push(gear)
    else byBrand.set(gear.brand, [gear])
  }

  return [...byBrand.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([brand, models]) => ({ brand, models }))
}
```

- [ ] **Step 4: Verify the two seed entries against real product pages**

Open the DJI store pages for the Mavic 3 Pro ND filter set and the Avata 2 ND filter set. Correct `ndStops`, `facts` and `filterSource` to match what the pages state, and put the real URLs in `source`. If a set cannot be confirmed, move that model to `unverifiedGear` and seed `gearPresets` with a model that can be confirmed instead.

The `cites a checkable https source` test passes on any `https://` string, so it cannot catch a placeholder. This step is the check.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 17 tests from `nd.spec.ts` plus 16 from `gear.spec.ts`.

- [ ] **Step 6: Commit**

Note: the "Gear presets beyond drones" backlog entry that used to be this task's
Step 6 was written to `BACKLOG.md` on 2026-08-16, ahead of this task. Do not
write it again.

```bash
git add app/data/gear.ts test/gear.spec.ts
git commit -m "feat: add gear preset data layer with integrity tests

Defines GearPreset and UnverifiedGear, plus lookup and grouping
helpers. Sixteen tests guard the schema: unique kebab-case ids, sorted
duplicate-free filter lists, known filter strengths only, a non-empty
facts line, and an https source on every entry.

Seeds the list with the two models verified against DJI product pages.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Research and populate the gear list

Fill `gearPresets` and `unverifiedGear`. This task has no new code, so its gate is the Task 2 test suite plus a source URL on every line.

**Files:**
- Modify: `app/data/gear.ts`

**Interfaces:**
- Consumes: the `GearPreset` and `UnverifiedGear` types from Task 2.
- Produces: no new symbols. Later tasks depend only on the list being populated.

- [ ] **Step 1: Read the reference article and list the brands**

Fetch <https://www.thedronegirl.com/2025/09/15/the-best-alternatives-to-dji-drones/> and write down every brand and model it names. This is the starting list for the non-DJI half.

- [ ] **Step 2: Build the DJI candidate list**

Cover the current and recently current line-up. Older models stay out unless they are still widely flown.

- Mini family: Mini 3, Mini 3 Pro, Mini 4 Pro, Mini 4K, Flip, Neo
- Air family: Air 3, Air 3S, Air 2S
- Mavic family: Mavic 3 Classic, Mavic 3 Pro, Mavic 3 Pro Cine, Mavic 4 Pro
- FPV family: Avata 2, Neo, DJI FPV
- Professional: Inspire 3

Handheld cameras (Osmo Action, Osmo Pocket, Osmo 360) are **out of scope** here. They belong to the backlog entry written in Task 2.

- [ ] **Step 3: Verify each candidate**

For each model, find a page that states the ND set. In order of preference:

1. The maker's own store page for that model's ND filter accessory.
2. A named third-party maker's product page for that model — Freewell, PolarPro, K&F Concept, Skyreat.

Record: the exact ND values sold, whether the set is first or third party, and the URL.

For the facts line, take aperture and frame rates from the maker's specifications page. Keep each fact under about 18 characters so the line wraps well at 390px. Use an en dash in ranges (`f/2.8–f/11`), matching the seed entries.

- [ ] **Step 4: Convert ND names to stops**

`ndStops` holds stops, not ND numbers. The mapping is `stops = log2(NDnumber)`:

| ND | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1000/1024 |
|---|---|---|---|---|---|---|---|---|---|---|
| stops | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |

A set sold as "ND8/16/32/64" becomes `[3, 4, 5, 6]`. Sets marketed as ND1000 are 10 stops.

- [ ] **Step 5: Record every model that failed verification**

Any candidate whose ND set could not be confirmed goes into `unverifiedGear`, not into `gearPresets`. Write the reason as one plain sentence a pilot understands. Use these forms:

```ts
{
  brand: 'Autel Robotics',
  name: 'EVO Lite+',
  reason: 'No ND filter set found from the maker or a known third party.',
  checked: '2026-08-16'
},
{
  brand: 'HoverAir',
  name: 'X1',
  reason: 'Filters are sold, but no page states the exact ND strengths.',
  checked: '2026-08-16'
}
```

Set `checked` to the date the research actually ran.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS. If `only lists filters the app knows about` fails, an ND value outside 1–10 stops was entered. If `keeps every filter list sorted` fails, an `ndStops` array is out of order.

- [ ] **Step 7: Spot-check the count**

Run: `npm run dev`, open the ND tab, and count the models in the select against `gearPresets.length`. They must match, plus the one "Any camera" entry. (The picker arrives in Task 4; if running Task 3 alone, verify by reading the file instead.)

- [ ] **Step 8: Commit**

```bash
git add app/data/gear.ts
git commit -m "feat: populate gear presets from verified sources

Adds the DJI line-up and the non-DJI brands from the reference article,
each with a cited ND filter set. Models whose filter set could not be
confirmed are listed in unverifiedGear with a reason and a check date
rather than guessed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: The gear picker and the filtered ND grid

**Files:**
- Modify: `app/components/NdFilters.vue`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `ANY_GEAR_ID`, `gearPresets`, `findGear`, `gearGroups` from `app/data/gear.ts`; `snapStopsToAvailable`, `ndFilters` from `app/utils/nd.ts`.
- Produces: the persisted key `dpt:nd-gear`, holding a `GearPreset['id']` or `ANY_GEAR_ID`.

- [ ] **Step 1: Add the gear state to the script block**

In `app/components/NdFilters.vue`, extend the imports:

```ts
import {
  shutterSpeeds,
  ndFilters,
  calculateExposure,
  getSpeedIndex,
  snapStopsToAvailable,
  DEFAULT_SPEED_INDEX
} from '../utils/nd'
import { ANY_GEAR_ID, gearGroups, findGear, unverifiedGear } from '../data/gear'
```

Then add this block directly after the `selectedStops` declaration:

```ts
const selectedGearId = usePersistedRef('nd-gear', ANY_GEAR_ID)

const activeGear = computed(() => findGear(selectedGearId.value))
const brandGroups = gearGroups()

const availableStops = computed(() =>
  activeGear.value ? activeGear.value.ndStops : ndFilters.map(f => f.stops)
)

const visibleFilters = computed(() =>
  ndFilters.filter(filter => availableStops.value.includes(filter.stops))
)

// Read through a computed rather than snapping `selectedStops` in a watcher.
// Both refs restore in their own onMounted callback, in declaration order, so a
// watcher would run against a not-yet-restored filter and then be overwritten.
// Snapping at read time has no ordering dependency, and switching back to an
// earlier aircraft restores the filter that was originally chosen for it.
const effectiveStops = computed(() =>
  snapStopsToAvailable(selectedStops.value, availableStops.value)
)
```

- [ ] **Step 2: Point the calculation at `effectiveStops`**

Replace the two computeds that still read `selectedStops`:

```ts
const calculatedSpeed = computed(() =>
  calculateExposure(baseSpeed.value.value, effectiveStops.value)
)

const ndFactor = computed(() => Math.pow(2, effectiveStops.value))
```

- [ ] **Step 3: Add the gear card to the template**

Insert this as the first card inside the left column, above the "Base exposure" card:

```vue
      <!-- Gear Selection Card -->
      <div class="glass-panel p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <label for="gear" class="t-label">
            Your gear
          </label>
          <!-- A native select, not a custom list: it holds 30+ models, opens
               the OS picker on a phone, and needs no JavaScript. -->
          <select
            id="gear"
            v-model="selectedGearId"
            class="w-full px-3 py-2 rounded-xl glow-input t-body-sm h-11 cursor-pointer"
          >
            <option :value="ANY_GEAR_ID">Any camera &mdash; all filters</option>
            <optgroup v-for="group in brandGroups" :key="group.brand" :label="group.brand">
              <option v-for="gear in group.models" :key="gear.id" :value="gear.id">
                {{ gear.name }}
              </option>
            </optgroup>
          </select>
        </div>

        <!-- Facts are static prose, not ticking or columnar digits, so they stay
             in Josefin rather than the mono stack. -->
        <p v-if="activeGear" class="t-body-sm text-ink-muted">
          <template v-for="(fact, index) in activeGear.facts" :key="fact">
            <span v-if="index > 0" class="text-ink-faint"> &middot; </span>{{ fact }}
          </template>
        </p>
        <p v-else class="t-body-sm text-ink-muted">
          Pick your aircraft to see only the filters that fit it.
        </p>
      </div>
```

- [ ] **Step 4: Filter the ND grid and compare against `effectiveStops`**

In the ND filter grid, change the loop source and the two selection comparisons:

```vue
          <button
            v-for="filter in visibleFilters"
            :key="filter.stops"
            @click="selectedStops = filter.stops"
            :aria-pressed="effectiveStops === filter.stops"
            class="tap flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-xl border transition-colors cursor-pointer"
            :class="effectiveStops === filter.stops
              ? 'bg-brand-petrol-800 text-white dark:bg-brand-glow dark:text-brand-petrol-950 border-transparent shadow-md'
              : 'bg-brand-petrol-800/5 dark:bg-brand-green-800/25 border-brand-petrol-800/12 dark:border-brand-green-800/20 hover:bg-brand-petrol-800/12 dark:hover:bg-brand-green-800/40'"
          >
```

- [ ] **Step 5: Tell the user where the missing filters went**

Replace the help paragraph under the "Neutral density filter" heading with a version that reacts to the gear:

```vue
          <p class="t-body-sm mt-1.5">
            <template v-if="activeGear">
              The filters made for the {{ activeGear.name }}. A higher number blocks more light.
            </template>
            <template v-else>
              Pick the filter you will mount. A higher number blocks more light.
            </template>
          </p>
```

- [ ] **Step 6: Add `aria-pressed` to the shutter quick picks**

The ND buttons announce their state and these do not. On the quick-pick button, add:

```vue
                :aria-pressed="selectedBaseIndex === getSpeedIndex(preset.value)"
```

- [ ] **Step 7: Verify in the browser at 390px**

Run: `npm run dev`, open http://localhost:4000 in a 390px-wide viewport, switch to the ND tab.

Check each of these:
1. The gear select shows "Any camera — all filters" first, then brands as groups.
2. Choosing a DJI Mavic 3 Pro reduces the ND grid to that model's filters.
3. The facts line appears under the select and wraps without overflowing.
4. Choosing a model whose set excludes the current filter moves the highlight to the nearest available one, and the hero number updates with it.
5. Reloading the page keeps the chosen gear.
6. Choosing "Any camera" brings all ten filters back.

- [ ] **Step 8: Record the new key and rules in AGENTS.md**

In `AGENTS.md`, under `## Persistence`, extend the "Remembered today" sentence to include the gear:

```markdown
`usePersistedRef(key, fallback)` in `app/composables/usePersistedRef.ts` backs a
ref with localStorage under the `dpt:` namespace. Remembered today: basemap,
location, active tab, ND filter, base shutter speed and selected gear. Theme
uses its own older `color-theme` key.
```

Then add a new section after `## Explanatory copy`:

```markdown
## Gear data

`app/data/gear.ts` is the only place gear lives. A model appears in
`gearPresets` **only** when its ND set was read off a real product page named in
`source`. A model that could not be confirmed goes in `unverifiedGear` with a
plain-sentence reason and an ISO `checked` date, and the app shows that list, so
a gap is visible rather than silent.

`ndStops` holds **stops**, not ND numbers: `stops = log2(NDnumber)`, so a set
sold as ND8/16/32/64 is `[3, 4, 5, 6]`. `test/gear.spec.ts` enforces unique
kebab-case ids, sorted duplicate-free lists, known strengths, a non-empty facts
line and an `https://` source.

Ids are persisted under `dpt:nd-gear`, so **never rename an id in place** — a
returning user's stored choice would silently fall back to "Any camera".

The filter selection is snapped through a computed (`effectiveStops`), not a
watcher. `selectedStops` and `selectedGearId` each restore in their own
`onMounted` callback, in declaration order, so a watcher would fire against a
not-yet-restored filter and then be overwritten.
```

- [ ] **Step 9: Run the full check**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 10: Commit**

```bash
git add app/components/NdFilters.vue AGENTS.md
git commit -m "feat: add gear picker to the ND filter tool

Selecting an aircraft narrows the ND grid to the filters that exist for
it and shows its optical facts. A filter outside the selected gear's set
snaps to the nearest available strength, resolving ties towards the
stronger filter. The choice persists under dpt:nd-gear.

Also gives the shutter quick-pick buttons the aria-pressed state the ND
buttons already had.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: The "model not listed" disclosure

Make the research gaps visible in the app, not just in the source.

**Files:**
- Modify: `app/components/NdFilters.vue`
- Modify: `app/assets/css/main.css`

**Interfaces:**
- Consumes: `unverifiedGear` from `app/data/gear.ts`, already imported in Task 4.
- Produces: the `.disclosure-summary` component class.

- [ ] **Step 1: Add the summary marker reset**

Safari still draws its own triangle for `<summary>` despite `list-style: none`, and it needs a vendor pseudo-element. Add this inside the existing `@layer components { … }` block in `app/assets/css/main.css`, next to `.tap`:

```css
  /* Safari draws its own disclosure triangle from a vendor pseudo-element that
     `list-style: none` does not reach. */
  .disclosure-summary {
    list-style: none;
    cursor: pointer;
  }

  .disclosure-summary::-webkit-details-marker {
    display: none;
  }
```

- [ ] **Step 2: Add the disclosure to the gear card**

Insert this as the last child of the gear card added in Task 4, after the facts paragraph:

```vue
        <!-- The research gaps, kept visible. A model missing from the list is a
             known gap with a reason, not an oversight. -->
        <details v-if="unverifiedGear.length" class="border-t border-brand-petrol-800/10 dark:border-brand-green-800/20 pt-3">
          <summary class="disclosure-summary tap-sm t-label-xs text-ink-muted hover:text-ink transition-colors">
            Model not listed?
          </summary>

          <div class="mt-3 flex flex-col gap-2.5">
            <p class="t-body-sm">
              These models were checked but left out. No ND filter set could be
              confirmed for them. Choose &ldquo;Any camera&rdquo; and pick your
              filter by hand.
            </p>

            <ul class="flex flex-col gap-2">
              <li
                v-for="item in unverifiedGear"
                :key="`${item.brand} ${item.name}`"
                class="t-body-sm text-ink-muted"
              >
                <span class="text-ink font-semibold">{{ item.brand }} {{ item.name }}</span>
                &mdash; {{ item.reason }}
              </li>
            </ul>
          </div>
        </details>
```

The list uses one inline run per model rather than a label/value row, because a brand, a name and a reason read as a sentence and should wrap as prose.

- [ ] **Step 3: Verify in the browser at 390px**

Run: `npm run dev`, open the ND tab in a 390px viewport.

Check:
1. The "Model not listed?" line sits at the bottom of the gear card, collapsed, with no browser triangle in Safari or Chrome.
2. Tapping it expands the list. The tap target is at least 38px tall.
3. Each entry wraps as prose across two or three lines. No horizontal scrolling appears on the page.
4. Both themes keep the text legible — check the light theme, where `text-ink-muted` is the weakest step in use.

- [ ] **Step 4: Run the full check**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/components/NdFilters.vue app/assets/css/main.css
git commit -m "feat: show the gear models that could not be verified

Adds a collapsed disclosure to the gear card listing every model checked
during research whose ND set could not be confirmed, with the reason. A
gap in the data is now visible to the user instead of silent.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: The mobile-first reorder

Today a phone shows shutter, then filters, then the answer off-screen. Put the answer above the grid the thumb taps.

**Files:**
- Modify: `app/components/NdFilters.vue:1-129` (template structure)

**Interfaces:**
- Consumes: everything from Tasks 4 and 5.
- Produces: no new symbols.

- [ ] **Step 1: Change the root container**

Replace line 2, the root `<div>`, with a flex column that only becomes a grid at `lg`:

```vue
  <div class="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-stretch lg:h-full min-h-0">
```

- [ ] **Step 2: Make both column wrappers disappear on mobile**

Replace the left column wrapper (line 4):

```vue
    <div class="contents lg:flex lg:flex-col lg:col-span-7 lg:gap-4 lg:min-h-0">
```

Replace the right column wrapper (line 86):

```vue
    <div class="contents lg:flex lg:flex-col lg:col-span-5 lg:gap-4 lg:min-h-0">
```

`display: contents` removes the wrapper's own box below `lg`, so all five cards become direct children of the root flex container and `order-*` can interleave them across the two columns. Note that this also drops the wrapper's `gap`, which is why the root now carries `gap-4`.

- [ ] **Step 3: Give each card its mobile order**

Add these classes to the five card `<div>`s. Each also gets `lg:order-0`, so at `lg` the DOM order inside each column wrapper takes over again.

| Card | Classes to add |
|---|---|
| Gear | `order-1 lg:order-0` |
| Base exposure | `order-2 lg:order-0` |
| Output / result | `order-3 lg:order-0` |
| ND filter grid | `order-4 lg:order-0` |
| Advice | `order-5 lg:order-0` |

For example the output card becomes:

```vue
      <div class="order-3 lg:order-0 glass-panel p-4 sm:p-6 rounded-2xl shadow-sm flex flex-col justify-between gap-4 lg:grow lg:min-h-50">
```

Note the two height constraints became `lg:`-only. `min-h-[200px]` and `flex-grow` exist to fill the desktop column; on a phone they only add empty space above the fold.

Apply the same treatment to the ND grid card, whose `flex-grow` and `min-h-[220px]` become `lg:flex-grow` and `lg:min-h-[220px]`.

- [ ] **Step 4: Tighten the result card for a phone**

The hero readout and its caption should cost less vertical space on a phone. In the output card, change the inner readout box's padding:

```vue
          <div class="flex flex-col items-center justify-center gap-2 py-4 sm:py-6 bg-brand-petrol-800/5 dark:bg-black/20 rounded-2xl border border-brand-petrol-800/10 dark:border-brand-green-800/20">
```

- [ ] **Step 5: Shorten the help text**

Two full sentences under two headings cost a phone screen a lot for little value. Replace the "Base exposure" help paragraph:

```vue
          <p class="t-body-sm mt-1.5">
            What your camera meters with no filter fitted.
          </p>
```

- [ ] **Step 6: Rename the clashing "Presets" label**

The shutter shortcut buttons are labelled "Presets", which now collides with gear presets. Change that label:

```vue
            <span class="t-label">
              Common
            </span>
```

- [ ] **Step 7: Verify at 390px**

Run: `npm run dev`, open the ND tab in a 390px-wide viewport.

Check:
1. The card order top to bottom is: gear, base exposure, result, ND grid, advice.
2. The result and at least one full row of the ND grid are visible at the same time without scrolling, after the gear card is scrolled past.
3. Tapping a filter changes the hero number while both stay on screen.
4. The page does not scroll horizontally at any point.
5. No card has empty dead space from a leftover desktop `min-height`.

- [ ] **Step 8: Verify at 1440px**

Resize to 1440px wide.

Check:
1. The two-column 7 / 5 split is unchanged from before this plan: gear, base exposure and the ND grid on the left; result and advice on the right.
2. The columns still stretch to equal height and nothing overflows the viewport.

- [ ] **Step 9: Verify both themes**

Toggle light and dark at 390px. Check that the gear select, the facts line and the disclosure all keep readable contrast in both.

- [ ] **Step 10: Run the full check**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 11: Update the README feature list**

In `README.md`, replace the ND bullet under `## Features`:

```markdown
- ND-filter shutter-speed calculator with motion-blur guidance
- Gear presets for drone models, limiting the filter choice to what fits
```

- [ ] **Step 12: Commit**

```bash
git add app/components/NdFilters.vue README.md
git commit -m "feat: reorder the ND panel mobile-first

On a phone the result now sits directly above the filter grid, so the
answer stays on screen while a filter is tapped. Previously it was below
the fold. Uses display:contents on the column wrappers below lg so
order-* can interleave cards across both columns; the desktop 7/5 split
is unchanged.

Also drops desktop-only min-heights on mobile, shortens the help copy,
and renames the shutter 'Presets' label to 'Common' now that gear
presets exist.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

Checked after writing, recorded so a reviewer can see what was considered.

**Spec coverage.** Every agreed item maps to a task: the data file (Task 2), the research with the no-guessing rule (Task 3), in-app tracking of unverified models (Task 5), the gear picker and facts strip (Task 4), the filtered grid and snapping (Task 4), the mobile reorder (Task 6), Vitest with real tests (Tasks 1 and 2), the `?.` guard (Task 1, Step 9), the BACKLOG entry for non-drone cameras (Task 2, Step 6), and the AGENTS.md updates (Task 4, Step 8).

**Deliberate scope additions** are listed in full in "Decisions Taken Without Being Asked", above, with a reversal recipe for each.

**Scope split, 2026-08-16.** Only Task 1 is active. Tasks 2 to 6 sit below the "DEFERRED — DO NOT BUILD YET" banner and are mirrored as unchecked items in [BACKLOG.md](../../../BACKLOG.md), so they are reachable from the file the project actually browses. The "Gear presets beyond drones" note was moved out of Task 2 and written to `BACKLOG.md` directly, because it is a research note and does not depend on any code.

**Known weak point.** Task 2's `cites a checkable https source` test passes on any `https://` string, so it cannot catch a placeholder URL. Task 2 Step 4 and Task 3 Step 3 are the human check. A stricter test would need network access during the test run, which is a bad trade.

**Type consistency.** `ndStops` is stops everywhere, never ND numbers. `effectiveStops` is the read path and `selectedStops` is the write path, consistently. `gearGroups` is a function in both its definition and its call sites. `quickPicks` replaces `presets` in both the script and the template.
