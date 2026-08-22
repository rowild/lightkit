# ND tool: dial redesign

*Design agreed with Robert on 2026-08-16, from two AI-generated reference
screenshots of a fictional "DRONE ND CALC" app.*

## 1. Why

The ND tool works but reads as a stack of form controls. The reference images
show a better shape for the same information: the frame rate is a dial, and the
recommended filter glows in the middle of that dial. One object answers "what am
I shooting?" and "what do I fit?" at the same time.

The references also contain fiction. `LIVE LUX`, `GIMBAL LOAD` and `APPLY FILTER
TO LENS` are dropped: no web app reads a light sensor on iOS, gimbal payload is
unrelated to exposure, and a neutral density filter is a piece of glass that a
button cannot fit. Their brushed-metal styling is dropped too. LightKit is glass
and petrol, in two themes; chrome would only work in one.

## 2. Scope

**In**

1. A combined frame-rate dial with the recommended filter at its centre.
2. The metered shutter speed becomes a slider, not a `<select>`.
3. A new aperture slider, and a derived "adjust aperture to f/x" readout.
4. The whole tool fits one phone screen without scrolling.

**Out, recorded in `BACKLOG.md`**

1. The ambient-conditions (EV) dial and its second input mode.
2. Per-model aperture ranges in `app/data/gear.ts`.

**Accessibility.** Keyboard control and ARIA roles are added where they are
cheap. They do not drive layout or visual decisions. Robert's instruction: the
users of this tool are drone pilots and photographers.

## 3. Product rules

No rule in `AGENTS.md` changes. Two need a note.

**Rule 1 — the camera model is never a mathematical input.** Still true. The new
aperture value is a *reading the user types in*, exactly like the metered shutter
speed. It is never derived from the selected gear, and selecting gear still
changes no number.

**Rule 3 — no strength may become unreachable.** The outcomes table moves behind
a button on phones only, because the height budget in section 6 has no room for
it. It stays one tap away, which is what the rule protects. On `lg` and wider it
stays visible in the right column, as today.

**Rule 4 — the result is never snapped to a commercial kit.** Unchanged, and
reinforced. The aperture readout is a second honest expression of
`residualStops`, the leftover the rule already demands the tool report.

## 4. The aperture maths

New module `app/utils/aperture.ts`. Pure TypeScript, no Vue, no browser APIs, so
it is unit-testable under the existing `node` vitest environment.

### 4.1 The series

The standard 1/3-stop f-number series, widest first:

```
1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 4.5, 5.0,
5.6, 6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16, 18, 20, 22
```

These are the marketed labels, not exact powers of √2 — the same choice
`shutterSpeeds` already makes, and for the same reason: a calculation built on
the label matches what the user reads off the aircraft.

### 4.2 Functions

```ts
/** Stops of light between two f-numbers. Positive means `to` is darker. */
stopsBetween(from: number, to: number): number   // 2 * Math.log2(to / from)

/** The f-number reached by changing exposure by `stops`.
    Positive stops close the iris, so the f-number rises. */
apertureAfterStops(from: number, stops: number): number  // from * 2 ** (stops / 2)

/** The nearest entry in the series. The series is never empty, so this
    always returns a value. */
nearestAperture(fNumber: number): { fNumber: number; index: number }

/** The whole suggestion, or null when the user has not set an aperture. */
apertureTrim(currentF: number, residualStops: number): ApertureTrim
```

```ts
interface ApertureTrim {
  /** The f-number to set, snapped to the series. */
  fNumber: number
  /** Stops the user is asked to move. Positive closes the iris. */
  stops: number
  /** What is still uncovered after snapping, in stops. Feeds describeOffset. */
  leftoverStops: number
  /** True when the ideal value fell outside f/1.4 - f/22 and was clamped. */
  clamped: boolean
}
```

### 4.3 Direction

`nd.ts` already gives `residualStops = filter.stops - needed`.

*   `residualStops > 0` — the filter blocks more than needed, so the frame is too
    dark. **Open** the iris. The f-number falls.
*   `residualStops < 0` — the filter is too weak. **Close** the iris. The
    f-number rises.

So the trim is `trimStops = -residualStops`, and the ideal aperture is
`apertureAfterStops(currentF, trimStops)`, snapped by `nearestAperture`.

Worked example. Metered 1/250 s, target 1/50 s, so `needed` is 2.32 stops. ND4
gives 2, so `residualStops` is −0.32 and `trimStops` is +0.32. From f/2.8 the
ideal is `2.8 * 2 ** 0.16` = f/3.13, which snaps to **f/3.2**. That move is
`stopsBetween(2.8, 3.2)` = 0.385 stops, leaving 0.063 stops uncovered — under
the 0.1 threshold `describeOffset` already treats as "spot on".

### 4.4 Clamping

If the ideal aperture falls outside the series it is clamped to the nearest end
and `clamped` is set. The UI then says so plainly rather than printing an
f-number no lens has. Per-aircraft limits are not modelled; that needs the gear
data in the backlog.

## 5. Components

Three new files under `app/components/nd/`, plus one new util. Each is dumb: it
takes a value, emits a new one, and knows nothing about ND filters.

### 5.1 `FrameRateDial.vue`

One SVG on a `0 0 200 200` viewBox, sized by its container.

**Geometry.** Angles are measured in degrees from 12 o'clock, positive clockwise.
A point at radius `r` and angle `a` is `x = 100 + r*sin(a)`, `y = 100 - r*cos(a)`.

| Ring | Radius | What |
|---|---|---|
| Labels | 92 | Frame rate text, `text-anchor` set per quadrant |
| Ticks | 72 → 80 | One per rate. The selected tick runs 68 → 84 in the accent |
| Answer ring | 52 | Stroke 6, `drop-shadow` glow in the accent |
| Centre | — | HTML overlay, so the type roles in `main.css` apply |

The track sweeps 270°, from −135° to +135°. For index `i` of `n`:

```
angle = -135 + (i / (n - 1)) * 270
```

**Input.** Pointer, wheel and keyboard.

*   Pointer: `angle = atan2(dx, -dy)` in degrees, clamped to ±135, then
    `index = round((angle + 135) / 270 * (n - 1))`. A drag starts only in the
    outer annulus, between 0.62× and 1.0× the radius, so a tap on the answer
    never grabs the dial. `touch-action: none` on that annulus.
*   Wheel: one index per notch.
*   Keys: `tabindex="0"`, arrows step one, Home and End jump to the ends.
    `role="slider"` with `aria-valuenow` and `aria-valuetext`.

**Props and events.**

```ts
defineProps<{
  modelValue: number          // index into `items`
  items: { label: string }[]
  centreTitle: string         // "ND32"
  centreCaption: string       // "Recommended filter"
  dimmed?: boolean            // true when the target comes from a fixed time
}>()
defineEmits<{ 'update:modelValue': [number] }>()
```

**Amended 2026-08-16, while writing the implementation plan.** `items` first
carried a second field, `sub`, holding each rate's shutter time, as the
reference image prints under every label. It is dropped. Seven two-line labels
force the label ring outward until the answer ring falls under 40% of the
container, at which point `ND1000` no longer fits inside it on a phone. The
selected rate's shutter time is already on the readout line under the dial.

**Small sizes.** Below 160px measured width the outer labels are hidden and only
the ticks remain. Nothing is lost, because the readout line under the dial always
names the current value. Measured with `ResizeObserver`.

### 5.2 `StopSlider.vue`

A native `<input type="range">` with `appearance: none` and a LightKit skin.
Native is used because it already handles touch drag, keyboard, and the pointer
capture that a hand-built slider gets wrong.

One row: caps label on the left, mono value on the right, track beneath.

```ts
defineProps<{
  modelValue: number
  items: { label: string }[]
  label: string
  offLabel?: string   // when set, index 0 is an "unset" position
}>()
```

`offLabel` prepends one extra stop to the track rather than changing the item
list. The aperture slider passes `offLabel: '—'`, so its index 0 means "not set"
and index 1 is the first real f-number, f/1.4. The metered shutter slider passes
no `offLabel`, so its indices map straight onto `shutterSpeeds` and the existing
`dpt:nd-metered-index` key keeps its meaning.

### 5.3 `NdFilters.vue`

Rebuilt around the two components above. All existing computed properties, the
persisted keys and the whole of `nd.ts` stay as they are.

Changes to behaviour:

*   The metered `<select>` becomes a `StopSlider`.
*   A second `StopSlider` is added for the current aperture, with `offLabel`.
*   The frame-rate button row and the shutter-angle disclosure become the dial
    plus its ⓘ dialog.
*   The ⓘ dialog holds the shutter angle buttons and "use a fixed time instead",
    which are the two secondary controls, per the modal rule in `AGENTS.md`.
*   When `targetMode` is `'time'`, the dial renders `dimmed` and the readout line
    names the fixed time. **Turning the dial always sets `targetMode` back to
    `'rate'`**, so a pilot can never be stuck in a mode they forgot they set.
*   The outcomes table is `hidden lg:flex`. On phones an "all filters" button
    opens the same list inside `InfoModal`, not `elevated` — it is opened from
    the page, not from the menu.

### 5.4 `nd.ts`

One change: `frameRates` becomes `[24, 25, 30, 50, 60, 120, 240]`. Seven values
sit 45° apart on the 270° track. `shutterFromFrameRate` and its tests are
untouched.

## 6. Layout and the height budget

### 6.1 The viewport flag

`app/pages/nd.vue` declares `definePageMeta({ fitViewport: true })`.
`app/layouts/default.vue` reads it:

```ts
const fitViewport = computed(() => route.meta.fitViewport === true)
```

and swaps the outer classes:

| `fitViewport` | Outer element | Inner wrapper |
|---|---|---|
| true | `h-[100svh] max-h-[100svh] overflow-hidden` | `h-full max-h-full overflow-hidden` |
| false (today) | `min-h-[100svh] overflow-x-hidden lg:h-screen lg:max-h-screen lg:overflow-hidden` | `min-h-0 lg:h-full lg:max-h-full lg:overflow-hidden` |

Route meta rather than a shared ref: whether a page fits the screen is a fact
about the page, and meta travels with the URL. A ref the page writes into the
layout would be the same second-source-of-truth trap `AGENTS.md` records for the
retired `dpt:active-app` key.

`svh`, not `vh` or `dvh`. `svh` is the viewport height with browser chrome
showing, so the layout is sized for its worst moment. `dvh` changes as chrome
retracts, which would resize the dial under the user's finger.

The solar page never sets the flag, so its map keeps today's behaviour.

### 6.2 The budget

Estimated, and to be confirmed by hand in Chrome DevTools at 375×667 and
390×844. On a 375×667 phone `100svh` is roughly 600px:

| Consumer | px |
|---|---|
| `safe-inset` padding and the safe area | 66 |
| Header and wordmark | 64 |
| Footer and theme toggle | 64 |
| Two shell gaps | 40 |
| **Left for the tool** | **~366** |

Inside the tool:

| Row | px |
|---|---|
| Gear select, label inline | 44 fixed |
| Metered shutter slider | 56 fixed |
| Aperture slider | 56 fixed |
| **Dial and answer ring** | **`flex: 1`, `aspect-ratio: 1`** |
| Answer strip, two lines | 64 fixed |
| Four gaps | 48 |

**Amended 2026-08-16, while writing the implementation plan.** The strip was
first budgeted at 44px for one line. Planning found that the frame-rate readout
— "25 fps · 1/50 s · 180°" and the ⓘ that opens the shutter-angle dialog — had
no home anywhere in the layout. It cannot go inside the ring, which barely holds
`ND1000` as it is. So the strip becomes two lines and 64px. The dial pays for
it.

The dial therefore gets about 98px on a 375×667 phone and about 198px on a
390×844 one. It is never given a fixed size; `flex: 1` with `aspect-ratio: 1` and
`max-height: 100%` lets it take what is left and no more.

If the measured numbers prove the 375×667 case too tight, the fallback is to move
the gear select into the ⓘ dialog, which returns 44px plus a gap. That is a
fallback, not the plan.

Desktop keeps today's two-column grid: inputs and dial on the left, the outcomes
table on the right.

### 6.3 The answer strip

Two rows under the dial:

```
1/50 s · 180° ⓘ                      [ all filters ]
ADJUST APERTURE TO                            f/3.2
```

When no aperture is set, the left half falls back to today's honest wording,
which is `describeOffset(residualStops)` — "0.3 stops over". The `all filters`
button is `lg:hidden`.

## 7. Persistence

One new key, `dpt:nd-aperture`, holding an index into the f-number series.

**It defaults to the "off" position**, rendered as `—`. Many drones have a fixed
iris; a DJI Mini 4 Pro is locked at f/1.7 and cannot be stopped down. Defaulting
to a real f-number would hand those pilots advice they cannot follow, on first
run, before they had any chance to say otherwise. Off is the honest default, the
slider is visible and labelled so it is discoverable, and one drag turns it on
for good.

Existing keys are unchanged: `nd-metered-index`, `nd-fps`, `nd-angle`,
`nd-target-mode`, `nd-target-index`, `nd-gear`, `nd-show-all-filters`. Restore
runs on mount through `usePersistedRef`, as everywhere else.

## 8. Testing

*   `test/aperture.spec.ts`, new. Covers `stopsBetween` against known pairs
    (f/2.8 to f/4.0 is one stop), `apertureAfterStops` round-tripping,
    `nearestAperture` snapping, both trim directions, and the clamped case at
    each end of the series. Written before the module, per the project's TDD
    workflow.
*   `test/nd.spec.ts` gains a case asserting `frameRates` contains 240 and that
    `shutterFromFrameRate(240)` is 1/480 s.
*   The components hold no arithmetic worth a DOM test; the vitest environment
    stays `node`.
*   Fitting the screen is verified by hand in Chrome DevTools at 375×667 and
    390×844, in both themes, checking `document.scrollingElement.scrollHeight`
    equals `clientHeight`.

## 9. Risks

1. **The height budget is estimated.** Header and footer heights are read off the
    markup, not measured. Section 6.2 names the fallback.
2. **98px is a small dial.** At that size only ticks and the centre readout are
    legible, and `ND1000` at six characters is the string that decides whether
    the centre works at all. The under-dial readout line carries the frame rate,
    so nothing is unreadable, but the effect is plainer than the reference
    image. The plan's last task measures this and names the fallback: move the
    gear select into a dialog, which returns 56px to the dial.
3. **Snapping the aperture to 1/3 stops leaves a residue.** It is reported
    through the existing `describeOffset`, never hidden.
4. **`aspect-ratio` inside a flex column** needs `min-height: 0` on every
    ancestor or the dial refuses to shrink. This is the most likely source of a
    stray scrollbar.
