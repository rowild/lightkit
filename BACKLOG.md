# Backlog

Notes for future brainstorming. Nothing here is decided or scheduled.

## Asked for on 2026-08-17

Robert's list, in his order. Two of them turned out to have history in the repo
already — noted against each so nobody starts from scratch.

- [ ] **A page that credits every tool and data source used.** Several of them
      require it: Open-Meteo asks for attribution under CC-BY 4.0, the tile
      providers require their own credit, and the fonts carry SIL OFL notices.
      Today the map's ⓘ names only whichever basemap and weather layer is
      switched on, and the font licences sit unread in `public/fonts/`. This
      needs to be one page listing all of it — libraries, data, tiles, fonts —
      reachable from the menu, not assembled per screen.

- [ ] **PWA — audit rather than build.** *It already is one:* `manifest.json`,
      a 192 and a 512 icon, an apple-touch-icon and a registered service worker
      are all in place, and the worker precaches the fonts and caches map tiles.
      So the real work is checking what is weak: installability on iOS, whether
      the app shell survives a cold start with no network, whether the update
      toast is reachable, and what happens to a wind field with no connection.
      Run Lighthouse's PWA audit and fix what it names, rather than rebuilding
      what exists.

- [ ] **A start page showing the tools as cards.** `/` currently redirects
      straight to the first entry in `app/data/tools.ts`, which was deliberate —
      it stopped any one tool being the accidental default — but it also means
      a visitor never sees that there is more than one. Cards would carry the
      `note` and `about` copy each tool already has in `tools.ts`. Watch the
      routing rule in AGENTS.md: every tool keeps its own URL, and the start
      page must not become a second source of truth about which tools exist.

- [ ] **"Will there be shadow when we want to be there?" — the next mini app,
      and the most important one.** A 3D view that takes the sun's real position
      for the chosen place and time and casts the shadows that follow from it.

      *This has a research section already*, further down under
      [Tools that fit the LightKit suite](#tools-that-fit-the-lightkit-suite) →
      **Sun direction and shadow calculator**, including a comparison of the 3D
      globe libraries that can render sun shadows and whether they shadow
      terrain. The open question recorded there — whether a whole globe is
      needed at all, or just a small local scene in plain three.js — is the
      first thing to settle, because it decides the weight of the whole app.
      The unanswered sub-question is where terrain height comes from, and
      whether flat ground plus object height is enough for what pilots actually
      ask.

- [ ] **Cookie settings.** Note that the app currently sets **no cookies at
      all** — everything it remembers lives in `localStorage` under the `dpt:`
      namespace, plus `color-theme` and the OpenWeatherMap key. That is still a
      consent question in the EU, since the rules cover storage on a device
      rather than cookies specifically. So this is really two decisions: what
      the app must ask permission for, and whether anything here counts as
      strictly necessary. Worth answering before writing a banner nobody needs.

- [ ] **Split the menu: a new "Infos" group, and rethink Settings.** The "More"
      group has become a bag holding two different kinds of thing — Light
      phases and About ND filters *explain*, while Settings *configures*. Those
      should be separate groups. The settings drawer wants the same look: it now
      holds an API key, weather overlay strengths, a pre-flight checklist and
      system utilities, and the checklist in particular is reference material
      rather than a setting.

## From the solar redesign — raised 2026-08-17

- [ ] **Decide what “today” means for the weather report.** The date-only
      selector is converted to noon. Late in the day, that target is already
      outside OpenWeather's remaining forecast blocks, so the closest available
      block can be early tomorrow while the selected date still says today.
      The new `Forecast 02:00` source-time row makes the mismatch visible. The
      product decision is whether today means current conditions or a noon
      planning forecast; air quality must then follow the same time instead of
      always remaining current.

- [ ] **Use the local calendar date when the solar planner opens.** It currently
      takes `new Date().toISOString()` and therefore uses the UTC date. In a
      positive UTC offset, the app opens on yesterday between local midnight
      and UTC midnight. This was observed in Vienna immediately after midnight
      on 2026-08-23.

- [ ] **Confirm the mouse-wheel zoom fix.** Robert reported that after closing
      the wind reading, wheel zoom stopped responding. It could not be
      reproduced with synthetic events in either mode. The likely mechanism is
      the native context menu interrupting the pointer sequence, so the
      `pointerup` OpenLayers waits for never arrives and its view is left with
      an interaction open — and the context menu is now suppressed over that
      layer, which should remove the cause. **Unverified on real hardware.** If
      it recurs, instrument OpenLayers' view interaction counter rather than
      guessing again.

- [ ] **Open-Meteo is free for non-commercial use only.** If LightKit ever
      becomes commercial, the wind field needs a paid plan. Its quota is also
      charged **per location, not per request** — a fact found the hard way via
      a 429 — so the 8×8 grid, the movement threshold and the ten-minute cache
      in `useWindField.ts` are load-bearing, not tidiness.

- [ ] **Some labels are at 10px**, one under the 11px floor AGENTS.md sets for
      Josefin's small x-height, and the basemap buttons are at 9px. Both were
      asked for explicitly. Worth a look on a real phone in daylight before it
      becomes the house style by accident.

- [ ] **The wind field's slowest cells still barely move.** The field is scaled
      so its *fastest* cell is readable, and the ratios are exact, so a cell at
      0.4 km/h beside one at 37 km/h is correctly almost still. That is honest,
      but it may read as "broken" to someone who has not been told. A one-line
      legend or a note in the dialog might be worth it.

- [ ] **The under-one-hour case in "next window" still shows only a start
      time.** Every other path now shows a start and an end. It was left alone
      because "starts 19:24" followed by a range contradicts itself, so it needs
      its own small decision.

## Open questions — check these next session

- [ ] **Maybe a whole 3D library for a globe is not necessary. It could be
      enough to just render the current location in 3D and with shadows.**

      If the view never leaves the selected spot, there is no globe to
      navigate — only a small local scene. That could be plain three.js with a
      directional light set from SunCalc's azimuth and altitude, at a fraction
      of Cesium's weight, and it could work offline.

      Open sub-questions: where would the terrain height data come from for a
      local scene, and is flat ground plus object height enough for the cases
      pilots actually care about? See the shadow research below.

      *Since 2026-10-11 the project already ships three.js*, lazily, for the
      sky view (`app/utils/sky/`). A local shadow scene could reuse its renderer
      setup, its sun direction from SunCalc (`skyDirection` in
      `app/utils/skyGeometry.ts`) and its globe math, without a second engine.

## Left open by the sky view — 2026-10-11

Found while building and reviewing the sky view, and deliberately not done
then. None of them blocks it.

- [ ] **Back on a phone leaves the page instead of closing the overlay.** In a
      standalone PWA started at `/solar` it even exits the app. `InfoModal` does
      the same. A same-URL history entry while a dialog is open, closed on
      `popstate`, keeps the "no URL for the view" decision.
- [ ] **Enter in a search field does not pick the first result** — on the map
      and in the sky view alike.
- [ ] **No focus trap behind the overlays.** `SkyView` and `InfoModal` set
      `aria-modal`, but Tab can still reach the page behind them. One app-wide
      fix with `inert` covers both.
- [ ] **Rapid taps on the planet can exceed Nominatim's one request per
      second.** Old answers are dropped, but the requests are still sent.
      Debounce the name lookup by about a second.
- [ ] **Time labels assume a 60 px top bar.** On a notched phone in standalone
      mode the bar is taller, and the bottom bar (taller with a polar note) is
      not avoided at all. Measure both bars instead.
- [ ] **A label can hop while the camera is dragged.** The placement search
      starts afresh every frame; keeping the previous spot while it is still
      free would stop it.
- [ ] **The switches are `role="radio"` without arrow keys.** `aria-pressed`
      toggle buttons are the cheapest honest fix.
- [ ] **A day whose sun never climbs above 6° names its one golden window
      "Evening Golden Hour"** (Longyearbyen in October). That is the segment
      model in `useSun.ts` picking morning or evening by the midpoint — a naming
      question for the whole app, not the sky view.

## ND tool: ambient conditions (EV) dial — deferred 2026-08-16

Split out of the dial redesign,
[`docs/superpowers/specs/2026-08-16-nd-dial-redesign-design.md`](docs/superpowers/specs/2026-08-16-nd-dial-redesign-design.md).
Held back to keep that change to one screen's worth of work.

The reference screenshots carried a second knob labelled "AMBIENT CONDITIONS
(EV)", running from snow and sand down to sunset. It is real photography — the
sunny-16 table — and it answers a question the tool cannot answer today:
**what do I fit before I launch, when there is no metered reading to type in?**

- [ ] A named-condition to EV<sub>100</sub> table: snow/sand 16, direct midday
      sun 15, hazy sun 14, cloudy bright 13, overcast 12, golden hour 11,
      sunset 9.
- [ ] `shutterFromEv(ev, fNumber, iso)`, which is
      `t = (N² × 100) / (2^EV × ISO)`. Pure, unit-testable, no Vue.
- [ ] An ISO input, because the sum above needs one and the metered path does
      not.
- [ ] A second `FrameRateDial`-shaped control for the conditions.

**The open design problem, and why it was deferred rather than just built.**
This is a second, competing answer to "how bright is it?". With both on one
screen a pilot cannot tell which input is driving the result. It needs an
explicit mode switch — "I metered it" against "guess from the sky" — and that
switch is the part that wants its own brainstorm.

Note that this does **not** breach product rule 1. Aperture and ISO would be
readings the user types, exactly like the metered shutter speed. The camera
*model* still never enters a calculation.

## ND tool: per-model aperture ranges — deferred 2026-08-16

Also split out of the dial redesign.

The redesign adds an aperture slider and an "adjust aperture to f/x" readout,
but knows nothing about what any given aircraft can actually do. Two gaps
follow:

- [ ] Many drones have a **fixed** iris — a DJI Mini 4 Pro is locked at f/1.7
      and cannot be stopped down at all. The tool cannot warn those pilots that
      the readout is useless to them. Today's mitigation is that the slider
      defaults to an "off" position, so nobody is handed advice unasked.
- [ ] Aircraft with a variable iris still have limits (Mavic 4 Pro main is
      f/2.0–8, Mavic 3 Pro main f/2.8–11). A suggestion outside that range is
      currently only clamped to the f/1.4–22 series, not to the aircraft.

Filling this means an `aperture` field on `GearEntry` for roughly fifty models,
each with an evidence URL and a checked date, per product rule 2. It is a
research job, not a coding one.

Whatever it holds is **presentation and warnings only**. Product rule 1 stands:
picking a camera must still change no number.

## ND tool: gear presets — written, held back

Designed and planned on 2026-08-16. **Only Task 1 was built** (Vitest plus the
pure `app/utils/nd.ts` module). Tasks 2 to 6 are written out in full and are
waiting:

- [ ] **Task 2** — the `app/data/gear.ts` data layer, with schema tests
- [ ] **Task 3** — research every DJI and non-DJI model and fill that file
- [ ] **Task 4** — the gear picker, the facts strip, the filtered ND grid
- [ ] **Task 5** — the in-app "model not listed" list of unverified models
- [ ] **Task 6** — the mobile-first reorder, so the result sits above the grid

Full steps, code and reasoning:
[`docs/superpowers/plans/2026-08-16-nd-gear-presets.md`](docs/superpowers/plans/2026-08-16-nd-gear-presets.md)

Task 3 is the reason the rest is held back. It is a long research grind across
many makers' product pages, and it does not belong in the same sitting as
anything else. The rule agreed for it: **a model whose ND set cannot be
confirmed against a real product page is never guessed.** It goes in an
`unverifiedGear` list with a reason and a check date, and the app shows that
list, so a gap stays visible.

## ND tool: estimate the reading from conditions

- [ ] **Needs a brainstorm before it can be planned.**

The ND tool asks the user to type in the shutter speed their camera meters
without a filter. That works on site, with the aircraft already up, and the
answer is exact.

It does not work at home the night before, when the user is deciding which
filters to pack. LightKit plans golden hour, so packing is exactly when it gets
opened.

The fix is a second way to fill the same field: pick the conditions — bright
sun, hazy sun, cloudy, golden hour — and let the app estimate. Everything
downstream is unchanged.

The blocker is that an estimate needs aperture and ISO, which a measured
reading already contains. The Mavic 3 Pro's main camera covers f/2.8 to f/11,
four stops that change the answer completely. The open question is how many
inputs a user will accept before walking outside and reading the screen is less
effort than answering the app.

Written up in
[`docs/superpowers/plans/2026-08-16-nd-required-strength.md`](docs/superpowers/plans/2026-08-16-nd-required-strength.md),
"Task 5 is not written yet".

## ~~Mobile: the app header scrolls sideways at 390px~~ — WRONG, no such bug

Retracted 2026-08-16, same day it was written.

The original claim was that the header overflowed by 8px and made a phone
scroll sideways. It does not. The measurement was bad: it read a *container's*
`scrollWidth` while the page width had been forced with inline styles, which
also caught the full-width background canvas.

The real test is `documentElement.scrollWidth > documentElement.clientWidth`,
and it is **false**. The 8px is the icon button's deliberate `-m-2` negative
margin, which lets the icon's visual edge line up with the text edge instead of
its padding box. It bleeds into the 16px safe-area padding, never reaches the
viewport edge, and the page container is `overflow-x: hidden` regardless.

Kept as a note because "measure the page, not a div" is the lesson, and because
anyone reading the old entry would go hunting for a bug that was never there.

## ND tool: pin the gear data to its source with a test

- [ ] **Small, high value.**

`test/gear.spec.ts` checks the *shape* of `app/data/gear.ts` — id format,
non-empty sources, ISO dates. It cannot catch a value that is well-formed but
wrong: a mistyped URL, a stop value off by one, a stale date.

Both times this data was reviewed, the reviewer had to write a throwaway script
to diff the module against `_MATERIAL/common-nd-gear-seed.json` field by field.
That script should be a test. Then the seed becomes the permanent fixture and
any drift fails CI forever, instead of depending on someone thinking to check.

## ND tool: the recommended filter can be hidden by the gear narrowing

- [ ] **UX question, not a bug.**

The answer card recommends from the full ND range, because the product rules
forbid snapping to a commercial kit. The outcomes table below narrows to the
filters sold for the selected aircraft.

So a combination exists where the card says "FIT ND4" while the narrowed table
shows only ND8 upward — the recommendation is not among the visible rows until
"show all" is tapped. Both behaviours are individually correct and required.
Together they read oddly.

Options worth weighing: always keep the recommended row visible even when
narrowed; or say plainly in the table when the recommendation sits outside the
selected aircraft's set. Decide before this confuses a real pilot.

## ND tool: known problems, not yet fixed

Found during the review on 2026-08-16. Deliberately left alone so far.

- [ ] **No aperture, no ISO.** The Mavic 3 Pro's main camera covers f/2.8 to
      f/11, about four stops the tool ignores. Photographers cannot be served
      without these.
- [ ] **Aperture as an alternative to ND.** The Mavic 3 Pro's main camera covers
      f/2.8 to f/11, about four stops. "Stop down or fit a filter?" is a real
      field question, but it is a comparison tool, not an input to this one.
- [ ] **Variable ND filters.** Sold as a range, such as ND2-32. The current
      model holds one strength per filter and cannot express a range.

## Gear presets beyond drones

The ND tool's gear presets cover drones only. The same preset shape should
extend to the rest of the field kit:

- **Action cameras** — GoPro, Insta360, DJI Osmo Action. Mostly fixed aperture,
  so ND is the only exposure control besides ISO. A close fit for the drone
  shape.
- **360 cameras** — DJI Osmo 360, Insta360 X5. Two lenses, so a filter set is a
  pair. The `ndStops` shape may need a note field for that.
- **Mirrorless and DSLR** — filters are sized by thread diameter (49mm, 67mm,
  82mm), not by camera. A preset would carry a lens's thread size, not a body's.
  This needs its own design pass; it does not fit the drone shape.
- **Phones** — clip-on and case-mounted filter systems exist (Moment, Freewell).
  Worth checking whether anyone actually uses them.

The open question: does one `GearPreset` type stretch over all four, or does the
interchangeable-lens case need a separate model? Decide before adding the second
category.

## Product name: LightKit

LightKit is a solid choice. Keep it as one word. It clearly covers natural
light, optical filters, and exposure tools.

### Assessment of the name

- The name is short, memorable, and easy to type.
- It works for web addresses (e.g. `lightkit.app` or `lightkit.dev`).
- It does not lock you into drones only, so traditional photographers and
  videographers will use it.

## Tools that fit the LightKit suite

### Sun direction and shadow calculator

- Calculates the sun angle (azimuth) and shadow length for any location and time.
- Helps drone pilots avoid direct lens flare and helps photographers find
  shaded ground.

#### Research: 3D globe libraries that can render shadows

Checked August 2026.

| Library | Shadows from sun | Terrain casts shadow | Notes |
|---|---|---|---|
| **CesiumJS** | Yes | **Yes** | The reference implementation. Apache 2.0. |
| **ArcGIS Maps SDK for JS** | Yes | **No** | Polished, ready-made Daylight widget. Esri licence. |
| **deck.gl** | Yes, on flat maps | n/a | `GlobeView` is experimental and documents no shadow support; `TerrainLayer` unsupported there. |
| **MapLibre GL JS v5** | No built-in | n/a | Has globe projection, 3D terrain, building extrusions. No sun-driven shadow casting. |
| **Shadowmap.org** | Yes | Yes | A finished commercial product, not a library. Worth a look before building. |

CesiumJS is the only one that shadows terrain, which is the case that matters
for a pilot in a valley:

```js
viewer.shadows = true
viewer.scene.globe.enableLighting = true
viewer.clock.currentTime = /* scrub time, shadows move */
```

Sun position comes from `Simon1994PlanetaryPositions`. `viewer.shadowMap` tunes
darkness, max distance and bias. Cesium OSM Buildings or Google Photorealistic
3D Tiles give real building shadows.

ArcGIS is easier to stand up but shadows **only real-world 3D objects — terrain
does not cast**, which rules out the mountain-shadow case.

#### The cost problem

Cesium is a multi-megabyte engine plus workers, with terrain and imagery
streamed from a service. The whole app is currently **620 KB gzipped** and works
offline with cached tiles and self-hosted fonts. Adding Cesium to the main
bundle would give that up.

#### Proposed two tiers

**Tier 1 — shadow vector on the existing 2D map. No new dependency.**
SunCalc already returns azimuth and altitude; the rest is trigonometry:

```
shadowLength    = objectHeight / tan(sunAltitude)
shadowDirection = sunAzimuth + 180°
```

Drawn as an arrow or polygon on the OpenLayers map. Works offline, costs nothing.

**Tier 2 — optional 3D view, Cesium, lazy-loaded on its own route, online only.**
Never part of the main bundle. Only worth it for real terrain and building shadows.

The deciding question: does a pilot need to see a mountain's shadow fall across
a valley, or just know the sun is at 240° and 12° up? If the second, Tier 1 is
the whole feature.

Sources: [CesiumJS ShadowMap](https://cesium.com/downloads/cesiumjs/releases/1.32/Build/Documentation/ShadowMap.html)
· [Cesium community: shadow and sun analysis](https://community.cesium.com/t/cesium-shadow-and-sun-analysis/18962)
· [deck.gl GlobeView](https://deck.gl/docs/api-reference/core/globe-view)
· [ArcGIS scene shadow sample](https://developers.arcgis.com/javascript/latest/sample-code/scene-shadow/)
· [ArcGIS Daylight widget](https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Daylight.html)
· [Shadowmap](https://shadowmap.org/)

### Time-lapse interval calculator

- Calculates the required interval between shots based on event duration,
  frame rate, and final clip length.
- Prevents wasted storage and battery during automated shoots.

### Long exposure shutter timer

- Calculates new shutter speeds when you stack heavy ND filters
  (such as ND64 or ND1000).
- Provides an on-screen countdown timer for manual bulb-mode exposures.

### Hyperfocal distance calculator

- Calculates the closest focus distance that keeps the background acceptably sharp.
- Helps landscape photographers set manual focus quickly without guessing.

### Moon phase and darkness window

- Displays moonrise, moonset, illumination percentage, and astronomical twilight.
- Helps creators plan night sky, Milky Way, and low-light shoots.
