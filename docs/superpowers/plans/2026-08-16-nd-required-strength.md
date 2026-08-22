# ND Required-Strength Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the ND tool around. Instead of "I have this filter, what shutter do I get?", it answers the question a pilot actually asks on site: **"My camera meters 1/2000 s and I want 1/50 s — which filter do I fit?"**

**Architecture:** All arithmetic stays in `app/utils/nd.ts` as pure functions, tested in a `node` environment. Gear data is ported from the researched seed into `app/data/gear.ts`. `NdFilters.vue` is rebuilt around the new question, mobile-first from the first line rather than retrofitted.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, Tailwind CSS v4, Vitest.

**Spec:** The product rules in [AGENTS.md](../../../AGENTS.md), section "ND tool product rules", are the binding authority. The evidence behind them is `_MATERIAL/camera-presets-fact-check-sources.md`. This document argues from those rules; where they disagree, the rules win.

**Supersedes:** [2026-08-16-nd-gear-presets.md](./2026-08-16-nd-gear-presets.md) Tasks 2–6. Task 1 of that plan is done and this plan builds on it.

---

## Status

| Task | State |
|---|---|
| 1. The required-strength arithmetic | **Done** |
| 2. The gear data port | **Done** |
| 3. Rebuild the panel around the new question | **Done** |
| 4. The gear picker and the unverified list | **Done** |
| 5. Estimate the reading from conditions | **Not designed.** Needs its own brainstorm before it can be planned. See below. |

---

## Task 5 is not written yet, and that is deliberate

Tasks 1–4 assume the user is **already flying** and can read a shutter speed off
their screen. That is the on-site case, and the answer it gives is exact.

It does not serve the other real case: **planning at home the night before**,
deciding which filters to put in the bag. This app also plans golden hour, so
packing is exactly when it gets opened.

The fix is one extra way to fill the same field. The user picks the conditions
— bright sun, hazy sun, cloudy, golden hour — and the app estimates the reading
instead of asking them to type it. Everything downstream is unchanged, because
it feeds the identical `meteredSeconds` value into the identical arithmetic.

**It is not written as a task because it is not designed.** The estimate needs
two inputs that Tasks 1–4 deliberately avoid:

- **Aperture.** A metered reading already contains it. An estimate does not, so
  it must be supplied. The Avata 2 is fixed at f/2.8; the Mavic 3 Pro's main
  camera runs f/2.8 to f/11, a four-stop range that changes the answer entirely.
- **ISO.** Same problem. Assuming ISO 100 covers most daylight drone work, but
  "most" is doing real work in that sentence.

The arithmetic itself is settled and standard — exposure value, `t = N² / 2^EV`,
with EV 15 for bright sun down to about EV 9 at sunset. The open question is how
many inputs a user will tolerate before the estimate costs more effort than
walking outside and reading the screen. That is a design question, not a coding
one, and it deserves the same treatment Tasks 1–4 got.

**Do not implement Task 5 from this note.** Brainstorm it first.

---

## Global Constraints

From [AGENTS.md](../../../AGENTS.md). Every task's requirements implicitly include this section.

**Product rules — these are the binding authority:**

- **The camera model is never a mathematical input.** No function in `app/utils/nd.ts` may take a camera or gear argument. This is mechanically checkable and a reviewer should check it.
- **A listing claims only that an ND solution exists** for that model. Every entry carries an evidence URL, a source type and a checked date. Unconfirmed models go in an `unverified` collection with a reason.
- **No strength may become unreachable.** Filters outside the selected model's set may start collapsed behind a one-tap "show all", but must always be one tap away.
- **The result is never snapped to a commercial kit.** Recommend from the full ND range and report the leftover error honestly.
- **Attenuation is stored as stops.** Factor is `2 ** stops`, transmission is `2 ** -stops`. `ND1000` is a display alias for the ten-stop class, whose exact factor is 1024.

**Engineering constraints:**

- **Node.js 24.11.0**, pinned in `.nvmrc`. Node 26 makes the dev server print a DEP0205 warning from `@tailwindcss/node`.
- **Tailwind v4 colour steps only**: 50, 100, 200 … 900, 950. An invented step such as `gray-550` generates no CSS and silently inherits.
- **Prefer ink tokens** `--color-ink`, `--color-ink-muted`, `--color-ink-faint`. Prefer `--color-brand-glow-amber` / `--color-brand-glow-cyan` over raw accents.
- **`--font-caps` (`.t-label`, `.t-label-xs`, `.t-title`) is UPPERCASE ONLY.** It has `descent-override: 0%`, so `g j p q y` hang outside the line box.
- **Monospace only for digits that tick or align in a column.** Static prose such as `f/2.8–f/11` uses Josefin.
- **Type roles, not raw sizes**: `.t-label` 12px caps, `.t-label-xs` 11px caps, `.t-title` 14px caps, `.t-body` 15px, `.t-body-sm` 14px, `.t-num-sm` 13px, `.t-num-xs` 11px, `.t-hero-num` clamp 28–40px.
- **Hit areas**: `.tap` (44px), `.tap-sm` (38px), applied only under `pointer: coarse`.
- **Rows mixing font sizes or families use `items-baseline`.**
- **Persisted state** uses `usePersistedRef(key, fallback)`, namespaced `dpt:`. **Restore runs on mount, never during setup.**
- **Mobile first.** Every layout is built and checked at **390px** before 1440px. Layout is not a later pass.

---

## Design Decisions

1. **No separate "forward" mode.** The old question — filter in hand, what shutter results — is answered by the aircraft's own display in the field. Rebuilding it as a mode would add a toggle and a wrong-mode failure state. Instead the answer card is followed by a table showing what **every** filter would give, which answers it for all ten filters at once, with no extra input and no mode to be stuck in.

2. **Frame rate is the primary target input; shutter angle is disclosed, not exposed.** A frame-rate row with a computed target (`50 fps → 1/100 s`) covers nearly every user. Shutter angle and a direct time entry sit behind two small links. Labelling these "Simple" and "Advanced" was considered and rejected: mode names make users wonder what they are missing, and they hide that the real question is what you are shooting.

3. **No aperture or ISO inputs.** A metered exposure already contains both. They would only matter if the user changed them at the same moment as fitting the filter, which is rare and error-prone. One line of text states the assumption instead. This follows product rule 1.

4. **The advice card is deleted.** Its job was to tell the user whether their resulting shutter was cinematic. That judgement is now the *input* — the user picks a frame rate and the 180° rule computes the target. Keeping an output that re-judges the input would be circular. This also removes the branch found to carry wrong copy: the "Middle-ground exposure" case was only reachable from the slow side, between 1/40 s and 1/2 s, while its text said "suits high-speed tracking shots".

5. **The shutter table moves to 1/3 stops.** The current list is full stops only, so **1/50 s does not exist in it** — the standard shutter for 24 and 25 fps. Nor do 1/100, 1/120 or 1/200. Cameras meter in 1/3 stops. In the old forward-only tool a coarse list was merely inconvenient; in a reverse calculation it is load-bearing, because the user must be able to enter the number their aircraft actually displayed. Labels follow the camera's nominal markings, not exact powers of two, because the label is what the user reads off the screen.

6. **`snapStopsToAvailable` is repurposed, not deleted.** It currently snaps a filter choice to the selected gear's kit, which product rule 4 forbids. Its arithmetic is still needed for a different job: snapping a fractional requirement such as 5.32 stops to the nearest real filter and reporting the leftover. Renamed `nearestFilter`, it now takes the full ND range rather than a gear kit.

7. **The tie-break still favours the stronger filter.** When a requirement sits exactly between two filters, pick the higher stop count. Too weak leaves the shutter faster than the target and the motion choppy; too strong only adds blur. Blur is the safer error. Unchanged from the previous plan, with a clearer justification.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `app/utils/nd.ts` | modify | All exposure arithmetic. No Vue, no browser, **and no gear argument**. |
| `app/data/gear.ts` | create | Ported seed: verified models, unverified models, evidence sources, lookup helpers. |
| `test/nd.spec.ts` | modify | Unit tests for the arithmetic. |
| `test/gear.spec.ts` | create | Schema and integrity tests for the ported data. |
| `app/components/NdFilters.vue` | rewrite | Presentation only, mobile-first. |
| `BACKLOG.md` | modify | Records what this plan deliberately leaves out. |
| `AGENTS.md` | modify | Records the new persisted keys. |

---

## Task 1: The required-strength arithmetic

**Files:**
- Modify: `app/utils/nd.ts`
- Modify: `test/nd.spec.ts`

**Interfaces:**
- Consumes: `NdFilter`, `ndFilters`, `formatExposure`, `CalculatedExposure` from the existing `app/utils/nd.ts`.
- Produces:
  - `const shutterSpeeds: ShutterSpeed[]` — replaced with a 1/3-stop table
  - `const SHUTTER_ANGLE_DEFAULT = 180`
  - `const frameRates: number[]`
  - `shutterFromFrameRate(fps: number, angleDegrees?: number): number`
  - `requiredStops(meteredSeconds: number, targetSeconds: number): number`
  - `interface FilterMatch { filter: NdFilter; residualStops: number }`
  - `nearestFilter(requiredStops: number, filters: NdFilter[]): FilterMatch | null`
  - `interface FilterOutcome { filter: NdFilter; seconds: number; label: string; offsetStops: number }`
  - `filterOutcomes(meteredSeconds: number, targetSeconds: number, filters: NdFilter[]): FilterOutcome[]`
  - Removed: `snapStopsToAvailable` (renamed to `nearestFilter` with a different return type)

- [ ] **Step 1: Write the failing tests**

Append to `test/nd.spec.ts`, and add the new names to the existing import at the top of the file:

```ts
describe('shutterSpeeds (1/3-stop table)', () => {
  it('includes the shutter speeds video actually uses', () => {
    // 1/50 is the 24 and 25 fps standard and was absent from the full-stop
    // table. Without it the user cannot enter what their aircraft displayed.
    const labels = shutterSpeeds.map(s => s.label)
    for (const needed of ['1/50 s', '1/100 s', '1/120 s', '1/200 s', '1/240 s']) {
      expect(labels).toContain(needed)
    }
  })

  it('runs from fastest to slowest with no duplicates', () => {
    const values = shutterSpeeds.map(s => s.value)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(new Set(values).size).toBe(values.length)
  })

  it('never leaves a gap wider than roughly a third of a stop', () => {
    // Only an upper bound. The table is not a clean 1/3-stop series: it also
    // carries the video values 1/120 and 1/240, which sit 0.06 stop from their
    // stills neighbours 1/125 and 1/250. A lower bound would reject those, and
    // the no-duplicates test above already catches a repeated entry.
    for (let i = 1; i < shutterSpeeds.length; i++) {
      const step = Math.log2(shutterSpeeds[i]!.value / shutterSpeeds[i - 1]!.value)
      expect(step).toBeGreaterThan(0)
      expect(step).toBeLessThan(0.45)
    }
  })

  it('gives every entry a distinct label', () => {
    // Two entries that print the same string are indistinguishable in the
    // picker, whatever their underlying values.
    const labels = shutterSpeeds.map(s => s.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('shutterFromFrameRate', () => {
  it('applies the 180-degree rule by default', () => {
    expect(shutterFromFrameRate(25)).toBeCloseTo(1 / 50, 10)
    expect(shutterFromFrameRate(60)).toBeCloseTo(1 / 120, 10)
  })

  it('halves the time at a 90-degree shutter angle', () => {
    expect(shutterFromFrameRate(25, 90)).toBeCloseTo(1 / 100, 10)
  })

  it('doubles the time at a 360-degree shutter angle', () => {
    expect(shutterFromFrameRate(25, 360)).toBeCloseTo(1 / 25, 10)
  })
})

describe('requiredStops', () => {
  it('measures how much light must be blocked to reach the target', () => {
    // 1/2000 s metered, 1/50 s wanted: the target is 40x longer, log2(40).
    expect(requiredStops(1 / 2000, 1 / 50)).toBeCloseTo(5.3219, 3)
  })

  it('returns a whole number when the gap is a whole number of stops', () => {
    expect(requiredStops(1 / 1000, 1 / 125)).toBeCloseTo(3, 10)
  })

  it('returns zero when the camera already meters the target', () => {
    expect(requiredStops(1 / 50, 1 / 50)).toBeCloseTo(0, 10)
  })

  it('goes negative when the target is faster than what was metered', () => {
    // The user needs more light, not less. No filter can do this.
    expect(requiredStops(1 / 50, 1 / 200)).toBeCloseTo(-2, 10)
  })
})

describe('nearestFilter', () => {
  it('picks the closest filter and reports how far off it is', () => {
    const match = nearestFilter(5.3219, ndFilters)!
    expect(match.filter.name).toBe('ND32')
    // ND32 is 5 stops, so it falls 0.3219 short of the requirement.
    expect(match.residualStops).toBeCloseTo(-0.3219, 3)
  })

  it('reports zero residual on an exact match', () => {
    const match = nearestFilter(6, ndFilters)!
    expect(match.filter.name).toBe('ND64')
    expect(match.residualStops).toBeCloseTo(0, 10)
  })

  it('breaks an exact tie towards the stronger filter', () => {
    // Too weak leaves the shutter faster than the target and the motion
    // choppy. Too strong only adds blur. Blur is the safer error.
    const match = nearestFilter(5.5, ndFilters)!
    expect(match.filter.name).toBe('ND64')
  })

  it('returns null when there are no filters to choose from', () => {
    expect(nearestFilter(5, [])).toBeNull()
  })

  it('never widens the search beyond the filters it was given', () => {
    const match = nearestFilter(9, [{ name: 'ND8', stops: 3 }])!
    expect(match.filter.name).toBe('ND8')
    expect(match.residualStops).toBeCloseTo(-6, 10)
  })
})

describe('filterOutcomes', () => {
  it('reports what every filter would give, in the order supplied', () => {
    const outcomes = filterOutcomes(1 / 2000, 1 / 50, ndFilters)
    expect(outcomes).toHaveLength(ndFilters.length)
    expect(outcomes.map(o => o.filter.name)).toEqual(ndFilters.map(f => f.name))
  })

  it('computes the resulting shutter for each filter', () => {
    const outcomes = filterOutcomes(1 / 2000, 1 / 50, ndFilters)
    const nd32 = outcomes.find(o => o.filter.name === 'ND32')!
    expect(nd32.seconds).toBeCloseTo(1 / 62.5, 10)
    expect(nd32.label).toBe('1/63 s')
  })

  it('says how far each filter lands from the target, in stops', () => {
    const outcomes = filterOutcomes(1 / 2000, 1 / 50, ndFilters)
    // ND32 gives 1/62.5 s against a 1/50 s target: still 0.32 stop too fast.
    expect(outcomes.find(o => o.filter.name === 'ND32')!.offsetStops).toBeCloseTo(-0.3219, 3)
    // ND64 overshoots into slower-than-target territory.
    expect(outcomes.find(o => o.filter.name === 'ND64')!.offsetStops).toBeCloseTo(0.6781, 3)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `shutterFromFrameRate is not exported`, plus failures in the new `shutterSpeeds` tests because the current table is full-stop only.

- [ ] **Step 3: Replace the shutter table**

In `app/utils/nd.ts`, replace the whole `shutterSpeeds` array with the 1/3-stop table. Labels follow the camera's nominal markings, which is what the user reads off the screen, so the values are the labelled reciprocals rather than exact powers of two.

```ts
/**
 * The 1/3-stop shutter series, fastest first.
 *
 * Cameras meter in 1/3 stops, and the reverse calculation needs the user to
 * enter the number their aircraft actually displayed. A full-stop table cannot
 * express 1/50 s - the standard shutter for 24 and 25 fps - nor 1/100, 1/120 or
 * 1/200.
 *
 * Values are the labelled reciprocals, not exact powers of two. A camera marked
 * "1/8000" is nearer 1/8192 in truth, but the label is what the user reads, and
 * a calculation built on the label matches what they typed.
 */
export const shutterSpeeds: ShutterSpeed[] = [
  1 / 8000, 1 / 6400, 1 / 5000, 1 / 4000, 1 / 3200, 1 / 2500,
  1 / 2000, 1 / 1600, 1 / 1250, 1 / 1000, 1 / 800, 1 / 640,
  1 / 500, 1 / 400, 1 / 320, 1 / 250, 1 / 240, 1 / 200, 1 / 160,
  1 / 125, 1 / 120, 1 / 100, 1 / 80, 1 / 60, 1 / 50, 1 / 40,
  1 / 30, 1 / 25, 1 / 20, 1 / 15, 1 / 13, 1 / 10,
  1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3,
  0.4, 0.5, 0.6, 0.8,
  1, 1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30
].map(value => ({
  value,
  // Cameras switch from fractions to decimals below about 1/3 s: a half second
  // is printed 0"5, not 1/2. Deriving the label the other way collides -
  // Math.round(1 / 0.5) and Math.round(1 / 0.6) both give "1/2 s".
  label: value < 0.4 ? `1/${Math.round(1 / value)} s` : `${value.toFixed(1)} s`
}))

/** Index of the default metered reading, 1/250 s. */
export const DEFAULT_SPEED_INDEX = shutterSpeeds.findIndex(s => s.label === '1/250 s')
```

This is 57 entries. It is deliberately **not** a clean 1/3-stop series: `1/240` and `1/120` are the values a DJI aircraft displays at 120 and 60 fps, and they sit only 0.06 stop from their stills neighbours `1/250` and `1/125`. Both belong in the table, because the user's job here is to type in the number their screen showed them.

Verified before this plan was written: 57 entries, strictly ascending, no duplicate labels, widest gap 0.415 stop.

- [ ] **Step 4: Add the frame-rate helpers**

Append to `app/utils/nd.ts`:

```ts
/** The 180-degree shutter rule: the shutter is open for half of each frame. */
export const SHUTTER_ANGLE_DEFAULT = 180

/** Frame rates offered as one-tap choices. */
export const frameRates = [24, 25, 30, 50, 60, 120]

/**
 * Target shutter time for a frame rate and shutter angle.
 *
 * A shutter angle is the fraction of each frame the shutter stays open,
 * expressed in degrees of a rotating disc. 180 degrees is half the frame, which
 * is the film convention and looks natural. Smaller angles look sharper and
 * more staccato; larger ones blur more.
 */
export const shutterFromFrameRate = (
  fps: number,
  angleDegrees: number = SHUTTER_ANGLE_DEFAULT
): number => angleDegrees / (360 * fps)
```

- [ ] **Step 5: Add the required-strength functions**

Append to `app/utils/nd.ts`:

```ts
/**
 * Stops of light that must be blocked to move from the metered reading to the
 * target shutter time.
 *
 * Negative means the target is faster than what the camera already meters, so
 * the user needs more light and no filter can help.
 */
export const requiredStops = (meteredSeconds: number, targetSeconds: number): number =>
  Math.log2(targetSeconds / meteredSeconds)

export interface FilterMatch {
  filter: NdFilter
  /**
   * How far the chosen filter lands from the requirement, in stops.
   * Negative: weaker than needed, so the shutter stays faster than the target.
   * Positive: stronger than needed, so the shutter goes slower than the target.
   */
  residualStops: number
}

/**
 * The filter closest to a fractional requirement.
 *
 * Takes the filters to consider as an argument and never widens beyond them, so
 * the caller decides the range. Product rule 4 forbids passing an aircraft's
 * commercial kit here: recommend from the full ND range and report the leftover
 * honestly instead.
 *
 * An exact tie resolves upwards, towards the stronger filter. Too weak leaves
 * the shutter faster than the target and the motion choppy; too strong only
 * adds blur, which is the safer error.
 */
export const nearestFilter = (required: number, filters: NdFilter[]): FilterMatch | null => {
  if (filters.length === 0) return null

  const best = filters.reduce((chosen, candidate) =>
    Math.abs(candidate.stops - required) <= Math.abs(chosen.stops - required)
      ? candidate
      : chosen
  )

  return { filter: best, residualStops: best.stops - required }
}

export interface FilterOutcome {
  filter: NdFilter
  /** Resulting exposure time in seconds. */
  seconds: number
  label: string
  /** Stops between the result and the target. Negative means still too fast. */
  offsetStops: number
}

/**
 * What every supplied filter would give from this metered reading.
 *
 * This is the old "forward" calculation, run for the whole range at once. It
 * replaces a separate forward mode: the user sees their recommendation and every
 * alternative together, with no extra input and no mode to be stuck in.
 */
export const filterOutcomes = (
  meteredSeconds: number,
  targetSeconds: number,
  filters: NdFilter[]
): FilterOutcome[] =>
  filters.map(filter => {
    const seconds = meteredSeconds * Math.pow(2, filter.stops)
    return {
      filter,
      seconds,
      label: formatExposure(seconds).label,
      offsetStops: Math.log2(seconds / targetSeconds)
    }
  })
```

- [ ] **Step 6: Delete `snapStopsToAvailable` and its tests**

Remove the `snapStopsToAvailable` function from `app/utils/nd.ts` and its `describe('snapStopsToAvailable', …)` block from `test/nd.spec.ts`. `nearestFilter` replaces it. Nothing else imports it — confirm with `git grep -n snapStopsToAvailable` before deleting, and report what that command printed.

- [ ] **Step 7: Confirm no function takes gear**

Run: `git grep -nE "gear|camera|drone|model" app/utils/nd.ts`
Expected: matches only inside comments, never in a parameter list. Product rule 1 says the camera model is never a mathematical input, and this file is where that rule is enforced. Report the output.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. If `steps by roughly a third of a stop` fails, an entry is missing or out of order in the table. If a `no duplicates` failure appears, it is the `1/2.5`, `1/1.6`, `1/1.3` labelling collision from Step 3.

- [ ] **Step 9: Commit**

```bash
git add app/utils/nd.ts test/nd.spec.ts
git commit -m "feat: add the required-ND-strength arithmetic

Adds requiredStops, nearestFilter, filterOutcomes and the frame-rate
helpers, so the tool can answer which filter to fit rather than what
shutter a filter produces.

Replaces the full-stop shutter table with a 1/3-stop one. The old table
had no 1/50 s, which is the standard shutter for 24 and 25 fps, so a
user could not enter the reading their aircraft displayed.

Deletes snapStopsToAvailable. Snapping a choice to an aircraft's
commercial kit is forbidden by the ND product rules; nearestFilter does
the same arithmetic against the full range and reports the leftover.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: The gear data port

Port the researched seed into a typed module. The research is already done and sourced; this task does not re-open it.

**Files:**
- Create: `app/data/gear.ts`
- Create: `test/gear.spec.ts`

**Source data:** `_MATERIAL/common-nd-gear-seed.json` — 20 drones under `common`, 30 camera bodies under `cameraCommon`, 16 held candidates under `articleCandidates`, and an `evidenceSources` map.

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `const ANY_GEAR_ID = 'any'`
  - `interface GearEntry { id: string; brand: string; model: string; category: 'drone' | 'mirrorless' | 'dslr' | 'compact' | 'cinema'; ndSupport: 'external' | 'internal' | 'both'; knownStops: number[]; sources: string[]; checkedAt: string }`
  - `interface UnverifiedGear { brand: string; model: string; reason: string; source?: string }`
  - `const gearEntries: GearEntry[]`
  - `const unverifiedGear: UnverifiedGear[]`
  - `findGear(id: string): GearEntry | undefined`
  - `interface GearGroup { brand: string; models: GearEntry[] }`
  - `gearGroups(): GearGroup[]`

Note on `knownStops`: it exists **only** to decide which rows start expanded in the outcomes table. It must never reach a calculation. Product rule 3 requires every other strength to stay one tap away.

- [ ] **Step 1: Write the failing tests**

Create `test/gear.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ndFilters } from '~/utils/nd'
import { ANY_GEAR_ID, gearEntries, unverifiedGear, findGear, gearGroups } from '~/data/gear'

const knownStopValues = ndFilters.map(f => f.stops)

describe('gearEntries', () => {
  it('carries every model from the researched seed', () => {
    // 20 drones plus 30 camera bodies in common-nd-gear-seed.json.
    expect(gearEntries.length).toBe(50)
  })

  it('gives every model a unique kebab-case id', () => {
    const ids = gearEntries.map(g => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('never uses the reserved "any" id', () => {
    expect(gearEntries.some(g => g.id === ANY_GEAR_ID)).toBe(false)
  })

  it('cites at least one https source for every model', () => {
    for (const gear of gearEntries) {
      expect(gear.sources.length).toBeGreaterThan(0)
      for (const source of gear.sources) expect(source).toMatch(/^https:\/\//)
    }
  })

  it('records an ISO check date for every model', () => {
    for (const gear of gearEntries) expect(gear.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('states how each model takes a filter', () => {
    for (const gear of gearEntries) {
      expect(['external', 'internal', 'both']).toContain(gear.ndSupport)
    }
  })

  it('only lists filter strengths the app knows about', () => {
    for (const gear of gearEntries) {
      for (const stop of gear.knownStops) expect(knownStopValues).toContain(stop)
    }
  })

  it('keeps knownStops sorted and free of duplicates', () => {
    for (const gear of gearEntries) {
      expect(gear.knownStops).toEqual([...gear.knownStops].sort((a, b) => a - b))
      expect(new Set(gear.knownStops).size).toBe(gear.knownStops.length)
    }
  })

  it('includes the aircraft the app was built for', () => {
    const names = gearEntries.map(g => `${g.brand} ${g.model}`)
    expect(names).toContain('DJI Mavic 3 Pro')
    expect(names).toContain('DJI Avata 2')
  })
})

describe('unverifiedGear', () => {
  it('gives every entry a brand, a model and a plain reason', () => {
    for (const item of unverifiedGear) {
      expect(item.brand.trim()).not.toBe('')
      expect(item.model.trim()).not.toBe('')
      expect(item.reason.trim()).not.toBe('')
    }
  })

  it('never repeats a model that is already verified', () => {
    const verified = new Set(gearEntries.map(g => `${g.brand} ${g.model}`))
    for (const item of unverifiedGear) {
      expect(verified.has(`${item.brand} ${item.model}`)).toBe(false)
    }
  })
})

describe('findGear', () => {
  it('finds a model by id', () => {
    const first = gearEntries[0]!
    expect(findGear(first.id)).toEqual(first)
  })

  it('returns undefined for the "any" id and for unknown ids', () => {
    expect(findGear(ANY_GEAR_ID)).toBeUndefined()
    expect(findGear('no-such-drone')).toBeUndefined()
  })
})

describe('gearGroups', () => {
  it('groups every model under its brand exactly once', () => {
    const groups = gearGroups()
    expect(groups.flatMap(g => g.models).length).toBe(gearEntries.length)
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

- [ ] **Step 3: Port the seed**

Create `app/data/gear.ts`. Transcribe from `_MATERIAL/common-nd-gear-seed.json`. Mapping rules:

- `common[]` entries become `category: 'drone'`. Take `knownStops` from the union of every kit's `stops`, sorted and de-duplicated. Take `sources` from `sources`. Set `ndSupport: 'external'` unless the seed records an internal ND system.
- `cameraCommon[]` entries keep their `category` and `ndSupport`. Resolve their `evidenceIds` against the seed's `evidenceSources` map into real URLs for `sources`. Set `knownStops: []` — an interchangeable-lens body has no fixed set, and product rule 2 says the app does not model the attachment.
- `articleCandidates[]` entries with `disposition` of `hold`, `verify_third_party`, `payload_specific`, `mission_payload_specific` or `exclude` become `unverifiedGear`, using the seed's `reason` verbatim. Entries with `disposition: 'common'` are already in `common[]` — do not duplicate them.
- `id` is `kebab-case(brand + ' ' + model)`.

Write the module with this shape:

```ts
/**
 * Camera and aircraft models known to support at least one physical ND
 * solution. Ported from the researched seed in
 * _MATERIAL/common-nd-gear-seed.json, checked 2026-08-16.
 *
 * See AGENTS.md, "ND tool product rules". In short: listing a model claims only
 * that an ND solution exists for it. Nothing here may reach a calculation, and
 * `knownStops` may only decide which rows of the outcomes table start expanded.
 */

export interface GearEntry {
  /** Stable kebab-case id. Persisted, so never rename one in place. */
  id: string
  brand: string
  model: string
  category: 'drone' | 'mirrorless' | 'dslr' | 'compact' | 'cinema'
  ndSupport: 'external' | 'internal' | 'both'
  /**
   * Strengths a maker is known to sell for this model.
   *
   * Presentation only: it decides which rows of the outcomes table start
   * expanded. It must never enter a calculation, and every other strength stays
   * one tap away. Empty for interchangeable-lens bodies, which have no fixed
   * set.
   */
  knownStops: number[]
  sources: string[]
  /** ISO date, so a stale entry is obvious. */
  checkedAt: string
}

export interface UnverifiedGear {
  brand: string
  model: string
  /** Why it is not listed, in one plain sentence. */
  reason: string
  source?: string
}

/** Sentinel id for "no gear selected". */
export const ANY_GEAR_ID = 'any'

export const gearEntries: GearEntry[] = [
  // ... transcribed from the seed ...
]

export const unverifiedGear: UnverifiedGear[] = [
  // ... transcribed from articleCandidates ...
]

/** Look up an entry. Returns undefined for ANY_GEAR_ID and unknown ids. */
export const findGear = (id: string): GearEntry | undefined =>
  gearEntries.find(gear => gear.id === id)

export interface GearGroup {
  brand: string
  models: GearEntry[]
}

/** Group entries by brand for an <optgroup> list, brands A to Z. */
export const gearGroups = (): GearGroup[] => {
  const byBrand = new Map<string, GearEntry[]>()

  for (const gear of gearEntries) {
    const models = byBrand.get(gear.brand)
    if (models) models.push(gear)
    else byBrand.set(gear.brand, [gear])
  }

  return [...byBrand.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([brand, models]) => ({ brand, models }))
}
```

**Do not invent data.** Every value comes from the seed. If a seed entry lacks something a field needs, move that model to `unverifiedGear` with the reason, and say so in your report.

- [ ] **Step 4: Add the missing DJI handheld cameras to `unverifiedGear`**

The seed covers no DJI handheld camera. The Osmo 360 was asked for by name and is a two-lens device, which the current shape does not express. Add:

```ts
  {
    brand: 'DJI',
    model: 'Osmo 360',
    reason: 'Not researched yet. Two lenses means a filter set is a pair, which this list cannot express.'
  },
  {
    brand: 'DJI',
    model: 'Osmo Pocket 3',
    reason: 'Not researched yet.'
  },
  {
    brand: 'DJI',
    model: 'Osmo Action 5 Pro',
    reason: 'Not researched yet.'
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. If `carries every model from the researched seed` fails, count `common` and `cameraCommon` in the seed with `node -e` and reconcile.

- [ ] **Step 6: Commit**

```bash
git add app/data/gear.ts test/gear.spec.ts
git commit -m "feat: port the researched ND gear list into a typed module

Transcribes 20 aircraft and 30 camera bodies from the researched seed,
each with its evidence URLs and check date, plus the held candidates as
unverified entries with their reasons.

knownStops is presentation only: it decides which rows of the outcomes
table start expanded and never reaches a calculation, per the ND product
rules in AGENTS.md.

Records the DJI handheld cameras as unverified. The Osmo 360 has two
lenses, so a filter set is a pair, which this shape cannot express.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Rebuild the panel around the new question

Mobile-first: build and check at 390px before touching the desktop arrangement.

**Files:**
- Modify: `app/components/NdFilters.vue` (rewrite)
- Modify: `AGENTS.md`
- Modify: `BACKLOG.md`

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces: persisted keys `dpt:nd-metered-index`, `dpt:nd-fps`, `dpt:nd-angle`, `dpt:nd-target-mode`, `dpt:nd-target-index`.
- Produces for Task 4: a computed named `outcomes`, which Task 4 wraps in `visibleOutcomes`. Task 3's template must render `outcomes` directly; Task 4 changes that binding.

The screen, top to bottom on a phone:

```
WHAT YOUR CAMERA METERED   (no filter)
[ 1/2000 s                           v ]

WHAT YOU WANT
[24] [25] [30] [50] [60] [120]   fps
   -> 1/50 s  ·  180 degree shutter
   Set shutter angle · Enter a time instead

+----------------------------------+
|            FIT  ND32             |
|   you need 5.3 stops             |
|   ND32 gives 5 - 0.3 stop short  |
|   you will shoot at 1/63 s       |
+----------------------------------+
Assumes ISO and aperture stay as metered.

WHAT EACH FILTER WOULD GIVE
  ND8     1/250 s    3 stops short
  ND16    1/125 s    2 stops short
  ND32    1/63 s     closest
  ND64    1/31 s     1 stop over
```

- [ ] **Step 1: Rewrite the script block**

Replace the whole `<script setup>` of `app/components/NdFilters.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePersistedRef } from '../composables/usePersistedRef'
import {
  shutterSpeeds,
  ndFilters,
  frameRates,
  formatExposure,
  shutterFromFrameRate,
  requiredStops,
  nearestFilter,
  filterOutcomes,
  SHUTTER_ANGLE_DEFAULT,
  DEFAULT_SPEED_INDEX
} from '../utils/nd'

const meteredIndex = usePersistedRef('nd-metered-index', DEFAULT_SPEED_INDEX)
const frameRate = usePersistedRef('nd-fps', 25)
const shutterAngle = usePersistedRef('nd-angle', SHUTTER_ANGLE_DEFAULT)
// 'rate' derives the target from frame rate; 'time' takes it directly.
const targetMode = usePersistedRef<'rate' | 'time'>('nd-target-mode', 'rate')
const targetIndex = usePersistedRef('nd-target-index', DEFAULT_SPEED_INDEX)

const metered = computed(
  () => shutterSpeeds[meteredIndex.value] ?? shutterSpeeds[DEFAULT_SPEED_INDEX]!
)

const targetSeconds = computed(() =>
  targetMode.value === 'rate'
    ? shutterFromFrameRate(frameRate.value, shutterAngle.value)
    : (shutterSpeeds[targetIndex.value] ?? shutterSpeeds[DEFAULT_SPEED_INDEX]!).value
)

const targetLabel = computed(() => formatExposure(targetSeconds.value).label)

const needed = computed(() => requiredStops(metered.value.value, targetSeconds.value))

/** True when the target is faster than what the camera already meters. */
const needsMoreLight = computed(() => needed.value <= 0)

const match = computed(() => nearestFilter(needed.value, ndFilters))

const outcomes = computed(() =>
  filterOutcomes(metered.value.value, targetSeconds.value, ndFilters)
)

/** "0.3 stop short" / "0.7 stop over" / "spot on". */
const describeOffset = (stops: number): string => {
  const rounded = Math.round(Math.abs(stops) * 10) / 10
  if (rounded < 0.1) return 'spot on'
  const unit = rounded === 1 ? 'stop' : 'stops'
  return stops < 0 ? `${rounded} ${unit} short` : `${rounded} ${unit} over`
}
</script>
```

- [ ] **Step 2: Build the template mobile-first**

Write the template as a single flex column with no `lg:` classes at all yet. Get it right at 390px first. Use the existing `glass-panel` card, `.t-label` for the section eyebrows, `.t-hero-num` for the filter name, `.tap` on the frame-rate buttons, and `.t-num-sm` for every shutter figure — those digits change as the user taps, so they need the mono stack.

Requirements the template must meet:

1. The **filter name is the hero**, not the shutter speed. `ND32` is the answer.
2. When `needsMoreLight` is true, replace the answer card with: "No filter needed. Your camera already meters slower than your target." Do not show a filter.
3. The frame-rate row uses `aria-pressed` on each button, matching the ND buttons' existing pattern.
4. Shutter angle and direct-time entry sit behind `<details>` disclosures using the `.disclosure-summary` class. If that class does not exist yet, add it to the `@layer components` block in `app/assets/css/main.css`:

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

5. The outcomes table uses `.row-kv` per row, since each row is a label and a value on one baseline.
6. The assumption line reads exactly: `Assumes ISO and aperture stay as you metered them.`

- [ ] **Step 3: Verify at 390px**

Run: `npm run dev`, open http://localhost:4000 at 390px wide, ND tab.

Check:
1. Entering 1/2000 s metered and tapping 25 fps recommends **ND32** and shows `you need 5.3 stops`.
2. The recommendation and at least three rows of the outcomes table are visible together without scrolling past the answer.
3. Tapping a different frame rate changes the recommendation immediately.
4. Setting metered to 1/50 s and target to 25 fps shows the "No filter needed" state.
5. Opening "Set shutter angle" and choosing 90 degrees halves the target time.
6. The page never scrolls horizontally.
7. Reloading keeps the metered reading, the frame rate and the angle.

- [ ] **Step 4: Add the desktop arrangement**

Only now add `lg:` classes. Two columns: inputs on the left, answer and outcomes on the right. Verify at 1440px that nothing overflows and both columns stretch to equal height.

- [ ] **Step 5: Record the new keys and the deleted advice card**

In `AGENTS.md`, under `## Persistence`, extend the remembered list to include the metered reading, frame rate, shutter angle and target mode.

In `BACKLOG.md`, under the ND known-problems section, remove the four items this plan fixes (no frame rate input, answers backwards, results that are not real settings, the coarse shutter list) and add:

```markdown
- [ ] **Aperture as an alternative to ND.** The Mavic 3 Pro's main camera covers
      f/2.8 to f/11, about four stops. "Stop down or fit a filter?" is a real
      field question, but it is a comparison tool, not an input to this one.
- [ ] **Variable ND filters.** Sold as a range, such as ND2-32. The current
      model holds one strength per filter and cannot express a range.
```

- [ ] **Step 6: Run the full check**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/components/NdFilters.vue app/assets/css/main.css AGENTS.md BACKLOG.md
git commit -m "feat: rebuild the ND panel around which filter to fit

The tool now answers the question asked on site - metered 1/2000 s,
want 1/50 s, which filter - instead of computing a shutter speed the
aircraft already displays. The filter name is the hero readout.

Below it, a table shows what every filter would give from the same
reading. That replaces a separate forward mode: no toggle, no
wrong-mode state, and every alternative is visible at once.

Deletes the advice card. Its job was to judge whether the resulting
shutter was cinematic; that judgement is now the input, since the user
picks a frame rate and the 180-degree rule sets the target. It also
carried wrong copy - the middle-ground branch was only reachable from
the slow side while its text described fast tracking shots.

Built at 390px first; the desktop columns were added afterwards.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: The gear picker and the unverified list

**Files:**
- Modify: `app/components/NdFilters.vue`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `ANY_GEAR_ID`, `gearGroups`, `findGear`, `unverifiedGear` from `app/data/gear.ts`.
- Produces: persisted key `dpt:nd-gear`.

- [ ] **Step 1: Add the gear state**

Add to the script block:

```ts
import { ANY_GEAR_ID, gearGroups, findGear, unverifiedGear } from '../data/gear'

const selectedGearId = usePersistedRef('nd-gear', ANY_GEAR_ID)
const activeGear = computed(() => findGear(selectedGearId.value))
const brandGroups = gearGroups()

// Presentation only. Product rule 3: every other strength stays one tap away,
// so this decides what starts expanded and nothing else. It never reaches a
// calculation - `outcomes` above is computed from the full ndFilters range.
const showAllFilters = usePersistedRef('nd-show-all-filters', false)

const highlightedStops = computed(() => activeGear.value?.knownStops ?? [])

const visibleOutcomes = computed(() => {
  if (showAllFilters.value || highlightedStops.value.length === 0) return outcomes.value
  return outcomes.value.filter(o => highlightedStops.value.includes(o.filter.stops))
})
```

- [ ] **Step 2: Add the picker above the metered input**

```vue
      <div class="glass-panel p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-3">
        <label for="gear" class="t-label">Your gear</label>
        <!-- A native select: 50+ models, opens the OS picker on a phone,
             searchable by keystroke, screen-reader correct, no JavaScript. -->
        <select
          id="gear"
          v-model="selectedGearId"
          class="w-full px-3 py-2 rounded-xl glow-input t-body-sm h-11 cursor-pointer"
        >
          <option :value="ANY_GEAR_ID">Other / camera not listed</option>
          <optgroup v-for="group in brandGroups" :key="group.brand" :label="group.brand">
            <option v-for="gear in group.models" :key="gear.id" :value="gear.id">
              {{ gear.model }}
            </option>
          </optgroup>
        </select>

        <p class="t-body-sm text-ink-muted">
          Your gear does not change any number. It only shows which filters are
          sold for it.
        </p>
      </div>
```

The default option text is `Other / camera not listed`, taken verbatim from the seed's `displayPolicy.defaultOption`.

- [ ] **Step 2b: Point the outcomes table at the filtered list**

Task 3's template renders the table from `outcomes`. Change that one binding to
`visibleOutcomes`:

```vue
          <div v-for="outcome in visibleOutcomes" :key="outcome.filter.stops" class="row-kv">
```

This is the only place the gear selection touches the display. `outcomes` itself
stays computed from the full `ndFilters` range, so the recommendation above the
table is unaffected — which is what product rule 1 requires.

- [ ] **Step 3: Add the "show all" control to the outcomes table**

Under the table, when a gear is selected and rows are hidden:

```vue
        <button
          v-if="highlightedStops.length && !showAllFilters"
          @click="showAllFilters = true"
          class="tap-sm t-label-xs text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          Show all {{ ndFilters.length }} filters
        </button>
        <button
          v-else-if="highlightedStops.length"
          @click="showAllFilters = false"
          class="tap-sm t-label-xs text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          Show only filters for the {{ activeGear?.model }}
        </button>
```

- [ ] **Step 4: Add the unverified-models disclosure to the gear card**

```vue
        <details v-if="unverifiedGear.length" class="border-t border-brand-petrol-800/10 dark:border-brand-green-800/20 pt-3">
          <summary class="disclosure-summary tap-sm t-label-xs text-ink-muted hover:text-ink transition-colors">
            Model not listed?
          </summary>

          <div class="mt-3 flex flex-col gap-2.5">
            <p class="t-body-sm">
              These were checked but left out. Pick &ldquo;Other&rdquo; and
              choose your filter by hand &mdash; the maths is the same.
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
        </details>
```

- [ ] **Step 5: Prove the picker changes no number**

Run: `npm run dev` at 390px. Set metered to 1/2000 s and 25 fps. Note the recommendation and the required stops.

Now change the gear from "Other" to DJI Mavic 3 Pro, then to a Sony body, then back.

Expected: **the recommendation and the required stops never change.** Only which rows of the table are visible changes. If any number moves, product rule 1 is broken — stop and report it.

Also confirm: with the Mavic selected, "Show all 10 filters" reveals every strength, and each is still tappable. Product rule 3 requires this.

- [ ] **Step 6: Record the keys**

In `AGENTS.md`, under `## Persistence`, add `dpt:nd-gear` and `dpt:nd-show-all-filters` to the remembered list, with a note that gear ids are persisted so an id must never be renamed in place.

- [ ] **Step 7: Run the full check**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add app/components/NdFilters.vue AGENTS.md
git commit -m "feat: add the gear picker and the unverified-model list

Selecting an aircraft or body changes no number. It collapses the
outcomes table to the strengths sold for that model, with every other
strength one tap away behind 'show all', per the ND product rules.

Adds a disclosure listing every model checked during research that could
not be confirmed, with the reason, so a gap in the data is visible to the
user rather than silent.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

**Product-rule coverage.** Rule 1 (no gear in the maths) is enforced by Task 1 Step 7 and proven by Task 4 Step 5. Rule 2 (evidence per entry) is enforced by the Task 2 schema tests. Rule 3 (nothing unreachable) is met by "show all" and checked in Task 4 Step 5. Rule 4 (no kit snapping) is met because `outcomes` and `match` both run against the full `ndFilters` range; `knownStops` only filters what is displayed. Rule 5 (stops are canonical) holds throughout; `ND1000` keeps its display label.

**Known weak points.**
- The `https://` source test cannot detect a wrong-but-well-formed URL. The seed was human-checked; this plan does not re-check it.
- `visibleOutcomes` is the one place presentation reads `knownStops`. It is the single point where rule 1 could be violated by a careless later edit. Task 4 Step 5's manual check is the guard; a reviewer should treat any calculation reading `knownStops` as Critical.
- The shutter table's arithmetic was executed before this plan was written, not reasoned about. A first draft derived slow labels with `Math.round(1 / value)`, which printed `1/2 s` for both 0.5 and 0.6, and asserted a 0.25-stop lower bound on the gaps that the real camera series violates at 1/15 to 1/13. Both defects were in the plan until the check caught them. The corrected table and test are what appear above.

**Deliberately out of scope**, recorded in `BACKLOG.md` by Task 3 Step 5: aperture as an alternative to ND, and variable ND filters.
