# Solar planner: the sky view

*Design agreed with Robert on 2026-10-10, in a brainstorming session. Every
decision below was asked and answered; the reason is recorded next to it.*

*Numbers updated on 2026-10-10 to the values tuned in the visual pass.*

## 1. Why

The Day Schedule is a flat bar. It answers *when* the golden and blue hours
happen, but not *why* they last longer in Reykjavik than in Quito, or why they
change with the season. The answer to both is geometry: the shape of the sun's
path across the sky at that place on that date.

The sky view shows that geometry. A small planet carries the selected place on
top. Over it stands a bow — the sun's path — and from the place, fans of light
reach up to the parts of the bow where the light is golden or blue. The fans are
the triangles Robert asked for: one corner at the place, the opposite edge on
the bow.

It must be **beautiful**. That is the stated requirement, not a nice-to-have.

## 2. Scope

**In**

1. An icon button in the Day Schedule header that opens the view.
2. A full-screen overlay over the solar page, with a close button and Esc.
3. Two bows, switchable: **Sky path** (the true 3D sun path) and **Clock**
   (the Day Schedule bar bent into a half circle).
4. Two planet looks, switchable: **Earth** (NASA imagery) and **Dots** (a
   stylised dot globe in the app palette).
5. Fans from the place to the bow for the four golden and blue windows, plus a
   faint daylight fan.
6. Hour beads along the bow whose size and brightness follow the sun's height,
   and the sun itself at "now" or at solar noon.
7. Golden and blue twilight bands on the planet surface.
8. Picking another place inside the view: tap the planet, or search by name.
9. A "My place" button that returns to the solar page's place.
10. An ⓘ dialog explaining what the view shows.
11. Motion: an opening sequence, morphs between bows and places, a calm idle.

**Out**

1. **Moving the time inside the view.** Offered and rejected by Robert: on one
   place the fans already show the whole day at once, so dragging the sun along
   the same bow adds nothing. Changing the *place* is what shows something new.
2. Changing the date inside the view. The view uses the solar page's date.
3. A URL for the view. It is an overlay; Robert chose that over its own page.
4. A post-processing bloom pass. Glow is drawn with additive sprites and
   shaders instead (section 7.6).
5. The moon.

## 3. Product rules

These go into `AGENTS.md` as a new section (text in section 13).

1. **The view explores; it does not move the solar page.** It opens at the
   page's place. A place picked inside the view stays inside the view. Closing
   it leaves the page, its map and the remembered location (`dpt:lat`,
   `dpt:lng`) untouched. Robert's reason: comparing Tromsø and Quito must not
   overwrite a saved launch site.
2. **The fans take their times from `getSolarSegments()`.** Never from a second
   calculation. The bar, the Light windows list and the sky view must not be
   able to disagree about when golden hour starts. Path colour and bead colour
   follow the segment a sample falls in, for the same reason.
3. **The stage is always dark.** It is space, in light mode too, like a photo
   viewer. The overlay root carries `data-theme="dark"`, which flips every token
   and `dark:` variant inside it (`main.css` scopes both to any
   `[data-theme="dark"]` element, not only `<html>`).
4. **Three.js loads only when the button is pressed.** It is imported
   dynamically, so it never enters the solar page's first download.

## 4. Coordinate frames

All of the geometry in this section is pure TypeScript with no Three.js and no
browser API, in `app/utils/skyGeometry.ts` and `app/utils/globeMath.ts`, so the
`node` Vitest environment can test it.

### 4.1 Globe model frame

The planet is a `THREE.SphereGeometry` of radius `r = 1` with an
equirectangular texture. With Three.js's default sphere UVs, a geographic point
maps to:

```
latLngToModel(φ, λ) = ( cos φ · cos λ,  sin φ,  −cos φ · sin λ )
```

so longitude 0 is +X, longitude 90°E is −Z, 90°W is +Z and 180° is −X. This
mapping is what makes a tap land on the right town, so a test builds a real
`SphereGeometry` and checks it against the vertices' own UVs.

The local directions at a place, in the model frame:

```
up    = latLngToModel(φ, λ)
east  = ( −sin λ,  0,  −cos λ )
north = ( −sin φ · cos λ,  cos φ,  sin φ · sin λ )
```

### 4.2 World frame

The globe mesh is rotated so the selected place sits at the top. In world space:

| Direction at the place | World axis |
|---|---|
| up (zenith) | +Y |
| east | +X |
| north | −Z |
| south | +Z |

The rotation is the matrix whose **rows** are `east`, `up` and `south`
(`south = −north`). `globeMath.orientationFor(φ, λ)` returns it as a unit
quaternion `[x, y, z, w]`.

The place itself is the world point **O = (0, r, 0)**. Every fan starts there.

`globeMath.worldToLatLng(p, orientation)` inverts this for a tap: apply the
inverse rotation, normalise, and read `φ = asin(y)`, `λ = atan2(−z, x)`.

### 4.3 Sun direction

`useSun().getSunPosition()` returns altitude and a compass azimuth (0 = north,
90 = east, clockwise). In the world frame:

```
direction(az, alt) = ( cos alt · sin az,  sin alt,  −cos alt · cos az )
```

Because the sun is effectively infinitely far away, the same vector lights the
whole planet. The day/night line and the twilight bands on the globe are
therefore correct everywhere, not just at the place.

## 5. The day model

`skyGeometry.buildSkyModel(date, lat, lng, now)` returns plain data. Inputs
come from `useSun()`; it does no astronomy of its own.

### 5.1 The span

The same span the Day Schedule uses: from the first segment's start (nadir) to
the last segment's end (next nadir). Call its length `T`.

### 5.2 Path samples

**A fixed count of 721 samples**, evenly spaced across the span (about one every
two minutes). A fixed count — not a fixed step — so two models for two places
always have arrays of the same length and can be morphed index by index.

Each sample carries `t`, `alt`, `az`, `f = (t − start) / T`, and the name of the
segment it falls in.

### 5.3 Windows

For every segment named `Morning Blue Hour`, `Morning Golden Hour`,
`Evening Golden Hour`, `Evening Blue Hour` or `Daylight`: its `start`, its `end`,
a `kind` (`blue`, `golden`, `day`) and **49 samples** from `start` to `end`
inclusive, so the fan's edges land exactly on the window boundaries rather than
on the nearest path sample. A window the segment list does not contain is
absent — the view never invents a window the bar does not show.

### 5.4 Hour beads

One bead at every full hour on the device clock inside the span. Each carries `t`, `alt`,
`az`, `f`, the segment `kind` (`golden`, `blue`, `day`, `twilight`, `night`) and
a **strength** `s = clamp(sin alt, 0, 1)`.

### 5.5 The sun

Today: `now`, re-read every second. Any other date: `solarNoon`. The model
returns its `t`, `alt`, `az`, `f` and segment `kind`.

### 5.6 Time zone

Every time the view prints is in the device's time zone, exactly like the rest
of the solar page. A place picked on the far side of the world therefore shows
its golden hour in *your* clock. That is consistent with the page, and the view
is about the shape of the day more than its clock; a per-place time zone would
be a change to the whole page, not to this view.

### 5.7 The two layouts

Both layouts turn a sample into a world point, with the same radius
**R = 1.6 r** (`BOW_RADIUS`, tuned in the visual pass). The bow is bigger
than the planet on purpose: on a little planet the ground curves away fast, so
the blue fans — which point *below* the horizon — float free above the surface
instead of disappearing into it. No glass ground is needed.

**Sky path.** `P = O + R · direction(az, alt)`.

**Clock.** `θ = π · (1 − f)` and `P = O + R · (cos θ · ê + sin θ · ŷ)`, where `ê`
is the default camera's right-hand direction (section 7.1): **−X north of the
equator, +X south of it**. That puts the morning end on the viewer's left in
both hemispheres. The clock is a clock, not the sky, so it always reads left to
right.

At the equator on an equinox the two layouts nearly coincide, which is the
point of putting them in the same scene: the clock is the idealised sky.

## 6. The screen

### 6.1 The button

In `DaySchedule.vue`'s header row, after the date: Lucide `Orbit` at 16px,
`v-tooltip="'Open the sky view'"`, `aria-label="Open the sky view"`. It sits on
the panel's right edge, so it carries `justify-end`, per the `.tap` rule in
`AGENTS.md`.

### 6.2 The overlay

`app/components/sky/SkyView.vue`, controlled with `v-model:open`, props `lat`,
`lng`, `date`. Teleported to `body`, `position: fixed`, `inset-x-0 top-0 h-svh`
(the `InfoModal` lesson: `inset-0` measures the large viewport on a phone).

**Stacking: `z-5500`.** Above the map chrome (1000–1020) and the settings
drawer (5000); below `InfoModal` (6000), so the ⓘ dialog opens on top without
needing `elevated`; below the tooltip (9000).

`role="dialog"`, `aria-modal="true"`, `aria-label="Sky view"`. Focus moves to
the close button on open and back to the trigger on close. The canvas is
`aria-hidden`; a visually hidden list repeats the four window times for screen
readers.

### 6.3 Layout

```
┌──────────────────────────────────────────┐
│ [🔍 Reykjavík, Iceland  · Sat 10 Oct] ⓘ ✕ │  top bar
│                                          │
│                  ☀                       │
│            ·  ·     ·  ·                 │
│        ·                  ·              │
│    19:12–19:58 ░░    ░░ 07:40–08:31      │  the stage
│  ─────────────── ◉ ───────────────       │
│     20:02–20:41 ▒▒    ▒▒ 07:01–07:36     │
│              (planet)                    │
│                                          │
│ [Sky path | Clock] [Earth | Dots] My place│  bottom bar
└──────────────────────────────────────────┘
```

* **Top bar:** the search field (showing the place name and the date), ⓘ, ✕.
* **Bottom bar:** two segmented switches and, only after another place has been
  picked, **My place**.
* Both bars use the existing glass surface and type roles. On a 390px phone the
  two switches share one row.

### 6.4 Remembered choices

`dpt:sky-bow` (`'sky' | 'clock'`, default `'sky'`) and `dpt:sky-planet`
(`'earth' | 'dots'`, default `'earth'`), through `usePersistedRef`. Only
`SkyView` reads them, so a per-caller ref is correct here. Anything else read
from storage falls back to the default.

### 6.5 Picking a place

* **Tap:** a pointer that goes down and up on the planet without moving more
  than 6px and within 350ms is a pick. Anything else is a camera drag. The
  principle is the map's: a pan is never a selection.
* **Search:** the Nominatim search and reverse geocoding move out of
  `LocationPicker.vue` into `app/composables/usePlaceSearch.ts`. The map keeps
  its exact behaviour and uses the same helper.
* After a tap, the place name comes from reverse geocoding. While it loads, or
  if it fails, the field shows coordinates (`64.15°, −21.94°`).
* **Offline:** tapping works; the search field says *Search needs a
  connection*.
* **My place** resets the view to the `lat`/`lng` props and hides itself.

## 7. The scene

`app/utils/sky/`, loaded with `await import()` when the overlay opens. It knows
nothing about Vue. `SkyView` talks to it through one interface:

```ts
interface SkyScene {
  setModel(model: SkyModel, orientation: Quat, opts: { animate: boolean }): void
  setBow(mode: 'sky' | 'clock', opts: { animate: boolean }): void
  setPlanet(mode: 'earth' | 'dots', opts: { animate: boolean }): void
  setSun(sun: SkySun): void
  onPick(handler: (lat: number, lng: number) => void): void
  playIntro(): void
  resize(): void
  dispose(): void
}
```

Files: `scene.ts` (renderer, camera, controls, loop, picking, labels),
`planetEarth.ts`, `planetDots.ts`, `bow.ts` (path, fans, beads, sun, horizon
ring), `stars.ts`, `palette.ts` (the colours below, in one place).

### 7.1 Camera

Perspective, 35° vertical field of view. It looks at `O + (0, 0.75, 0)` (landscape; `O + (0, −0.1, 0)` on a portrait phone) from the
**pole side**: from the north (−Z) north of the equator, from the south (+Z)
south of it, 5 units away on a landscape screen and 22° above the horizon
plane. On an upright phone it pulls back until the bow's half width (2.6 units,
with its labels and a margin) fits the screen, and centres the bow and planet
together. From there
the bow leans away from the viewer and both horizons are in view.

`OrbitControls` (from `three/addons`): damping on, pan off, zoom between 2.2
and 6 units (wider when the portrait fit pulls back: from 0.7 to 1.6 times the fitted distance), polar angle limited so the camera cannot go under the planet.

Pixel ratio `min(devicePixelRatio, 2)`.

### 7.2 Palette

The stage uses the **dark-theme** accents, since it is always dark:

| Role | Colour |
|---|---|
| Golden | `#ffc257` (`--color-brand-glow-amber`, dark) |
| Blue | `#8cc0e6` (`--color-brand-glow-cyan`, dark) |
| Structure | `#8fb6d6` (`--color-brand-glow`, dark) |
| Space | `#05080a` to `#0b1418`, a petrol-tinted black |
| Sun core | `#fff4e0` high, `#ffd27a` at 20°, `#ff9a3c` at 6°, `#ff6a3c` at 0° |

### 7.3 Planet: Earth

`SphereGeometry(1, 128, 64)` with one `ShaderMaterial` taking `uSunDir`:

* **Day:** NASA Blue Marble, lit by `dot(normal, uSunDir)` with a soft
  terminator (`smoothstep` across roughly ±0.1).
* **Night:** NASA Black Marble city lights where the surface is dark.
* **Bands:** the sun's altitude at a surface point is `asin(dot(normal,
  uSunDir))`. Between 0° and 6° the surface glows golden; between −8° and −4°
  it glows blue. The thresholds come from `useSun.ts` as uniforms (section
  10), not as numbers in the shader.
* **Atmosphere:** a second sphere at 1.035 r, back faces, a fresnel rim. Blue on
  the day side, warming to orange along the terminator.

### 7.4 Planet: Dots

About 40,000 points on a Fibonacci sphere at 1.002 r. On load, each point's
latitude and longitude are looked up in a land mask; sea points are dropped
(roughly 12,000 remain). A dark sphere at 0.995 r stops the far side's dots
showing through. Same `uSunDir` shading in the dots' shader: petrol `#42777b`
by day, `#193134` by night, and the golden and blue bands light the dots
amber and cyan.

### 7.5 Bow, fans, beads, sun

* **Horizon ring:** radius R in the tangent plane at O, thin, white at 15%
  alpha, a tick every 15°, N E S W as DOM labels.
* **Path line:** `Line2` (fat lines from `three/addons`), 2px, coloured by
  segment. In the sky layout its alpha fades from full at 0° to nothing at
  −18°, so the night half of the path dissolves instead of cutting through the
  planet.
* **Fans:** one triangle fan per window, `(O, Pᵢ, Pᵢ₊₁)` over its 49 samples.
  Two extra attributes: `aEdge` (0 at O, 1 at the rim) for a radial gradient,
  and `aAlong` (0 to 1 across the window) for the shimmer. Additive blending,
  no depth write, both sides drawn. Alpha rises with `aEdge^1.5` to a rim
  strength of 0.75 for golden and 0.6 for blue. The daylight fan uses the
  structure colour at 0.05.
* **Rim highlight:** each golden and blue window's stretch of the path is drawn
  again, brighter and slightly wider, so the fan's edge reads as a line of light.
* **Hour beads:** soft round sprites, additive. Size `0.5 + 0.5 s` of the base
  size, brightness by `s`. Colour by the bead's segment: white-gold by day,
  amber in golden, cyan in blue, between the two in civil twilight, dim petrol
  at night.
* **Sun:** a bright core sprite, a large soft glow sprite and a faint ray
  sprite turning slowly. Colour from the sun-core ramp in 7.2 by altitude.
  Below the horizon, on either bow, it is eclipsed (changed 2026-10-11, at
  Robert's request): a dark disc in a black glow that dims the light behind
  it, rimmed by a thin corona whose colour follows the depth — lilac in
  twilight, cyan in blue hour, indigo into the night, fainter as it sinks.
* **Labels:** `CSS2DRenderer` objects. One per golden and blue fan, reading
  `19:12–19:58` in `.t-num-xs`, in the fan's colour. Each is anchored at its
  fan's tip (the window's middle on the bow) and set off in screen space: a
  fixed pixel gap straight out from the pin, so it sits at the tip on any screen
  and at any zoom. If that spot is taken (by the pin, the sun, the bow, a fan,
  the planet, the horizon ring, a compass letter, another label or the screen
  edge) the label turns round the tip, or steps out a little, until it is clear;
  when nothing is free, the least bad spot wins.

### 7.6 Glow without bloom

No post-processing pass. Every glow — sun, beads, fans, pin — is an additive
sprite or an additive shader. A bloom pass would double the fill cost on a
phone for a look the sprites already give.

### 7.7 The pin

A small bright point at O, a short vertical stem, and a ring that pulses
outward every three seconds.

### 7.8 Stars

1,500 points on a sphere of radius 50, sizes 0.5–1.5px, a slow random twinkle.

## 8. Motion

GSAP (already a dependency) drives every timed change. All morphs are computed
on the CPU into the existing buffers: the arrays are small (721 path points,
five fans of 49), so this is cheaper and simpler than a second set of shader
attributes.

| Moment | What moves | Time |
|---|---|---|
| Open | Overlay fades in | 0–0.3 s |
| | Planet rises from the dark (scale 0.94→1) and turns 25° into place | 0–1.2 s |
| | The bow draws itself from morning to evening | 0.4–1.6 s |
| | Fans unfold from the pin to the rim, in time order, 0.15 s apart | from 1.2 s |
| | Hour beads light up along the bow | 1.4–2.2 s |
| | The sun flares | 2.0–2.5 s |
| Switch bow | Every point glides from one layout to the other | 1.2 s, ease in-out |
| Switch planet | Crossfade | 0.6 s |
| New place | The planet rolls the new place to the top (quaternion slerp) while the bow, fans and beads morph to the new model. A window that exists on only one side shrinks into, or grows out of, the pin. Labels fade out and back. | 1.4 s |
| At rest | Fans shimmer, the sun glow breathes ±4% over 4 s, stars twinkle. The camera never drifts. | — |

The intro never blocks input: dragging during it simply moves the camera.

**Reduced motion** (`prefers-reduced-motion: reduce`): no intro, no glides, no
roll. Changes cross-fade in 0.2 s. Shimmer, breathing and twinkle are frozen.

The render loop stops while the tab is hidden and when the overlay closes.

## 9. Loading, failure, odd places

* **Loading:** the dark stage with a small pulsing ring, until the scene module
  and the first planet's images are ready.
* **No WebGL:** if the renderer cannot be created, the stage shows *This device
  cannot draw the sky view. The Day Schedule shows the same windows.* and the
  close button.
* **Earth images unavailable** (first opening while offline): the view falls
  back to Dots and says *Earth images are not cached yet.*
* **Polar places:** a missing window has no fan. A short note in the bottom bar
  reuses the polar explanation `LightWindows.vue` already writes. Under the
  midnight sun the whole sky path stays above the horizon; in polar night it
  stays below and fades out.
* **Closing** calls `dispose()`: every geometry, material, texture and the
  renderer itself are released.

## 10. Changes to existing files

* **`useSun.ts`** — no change to any calculation. The four altitude thresholds
  it uses (6, 0, −4, −8) become one exported constant, `SOLAR_ALTITUDES`, and
  `getSolarSegments()` reads them from it. The planet shaders get them from the
  same place.
* **`LocationPicker.vue`** — its search and reverse-geocode requests move to
  `usePlaceSearch.ts`. Same URLs, same debounce, same result handling.
* **`DaySchedule.vue`** — the button and the `SkyView` it opens.
* **`package.json`** — `three` (^0.186) and `@types/three` (dev).
* **`AGENTS.md`** — section 13.

## 11. Assets

In `public/textures/`, served from our own origin so the service worker caches
them on first use (stale-while-revalidate for same-origin requests; no worker
change needed):

| File | Source | Size target |
|---|---|---|
| `earth-day.jpg` | NASA Visible Earth, Blue Marble Next Generation | 2048×1024, ≤ 600 KB |
| `earth-night.jpg` | NASA Earth Observatory, Black Marble | 2048×1024, ≤ 400 KB |
| `land-mask.png` | Natural Earth land polygons (public domain), rasterised | 1024×512, 1-bit |

NASA imagery is not copyrighted; Natural Earth is public domain.
`public/textures/SOURCES.md` records each file's URL and download date. The ⓘ
dialog credits *Earth imagery: NASA*.

## 12. Testing

**Unit tests** (Vitest, `test/*.spec.ts`, node environment):

* `globeMath`: `latLngToModel` agrees with a real `SphereGeometry`'s UVs;
  `orientationFor` puts the place on +Y, east on +X and north on −Z;
  place → world point → `worldToLatLng` returns the place (Reykjavík, Quito,
  Sydney, the antimeridian, both poles' neighbourhoods).
* `skyGeometry`:
  * every window's start and end equal the matching segment from
    `getSolarSegments()` to the millisecond;
  * the path always has 721 samples, whatever the place;
  * sky layout: a sample at altitude 0 lies in the horizon plane, at distance
    R from O; a sample at 90° lies at `O + (0, R, 0)`;
  * clock layout: `f = 0` on the viewer's left, `f = 1` on the right, `f = 0.5`
    straight up, in both hemispheres;
  * Tromsø on 21 June and 21 December, Reykjavík, Quito: windows present or
    absent as `getSolarSegments()` says.
* `usePlaceSearch`: request URLs and result shapes, with `fetch` stubbed.

**Build check:** `npm run build`, then confirm `three` sits in its own lazily
loaded chunk and not in the entry chunk.

**Visual check** in Chrome at desktop size and at 390×844: both bows, both
planets, a tap-picked place, a searched place, My place, reduced motion, and
the no-WebGL note. Screenshots of each.

## 13. `AGENTS.md` addition

> ## Sky view
>
> The orbit button in the Day Schedule header opens a full-screen 3D view of
> the day: a small planet, the sun's path as a bow over the selected place, and
> fans from the place to the golden and blue parts of the bow. Two bows (the
> true sky path, and the bar bent into a clock) and two planets (NASA Earth, a
> dot globe), each remembered (`dpt:sky-bow`, `dpt:sky-planet`).
>
> * **It explores; it never moves the page.** A place picked in the view stays
>   there. Closing it leaves the solar page and `dpt:lat`/`dpt:lng` untouched.
>   Robert's rule: comparing places must not overwrite a launch site.
> * **Fan times come from `getSolarSegments()`**, and the planet's twilight
>   bands from `SOLAR_ALTITUDES`. The view must never disagree with the bar.
> * **There is no time scrubber, on purpose.** On one place the fans already
>   show the whole day; changing the place is what shows something new.
> * **The stage is always dark**, via `data-theme="dark"` on the overlay root.
> * **Three.js is imported only when the view opens.** Keep it out of the entry
>   chunk.
> * **No bloom pass.** Glow is additive sprites and shaders; a bloom pass
>   doubles the fill cost on a phone.
