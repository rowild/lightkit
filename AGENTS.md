# LightKit engineering notes

Everything a session needs to know before touching this codebase. Loaded
automatically, so decisions recorded here cannot be missed. Product rules that
bind the app belong at the bottom of this file, **not** in a plan document — a
plan is read once, by whoever executes it.

LightKit's design system is defined in [nuxt.config.ts](./nuxt.config.ts) (font
loading) and [main.css](./app/assets/css/main.css) (tokens and type roles).

## Runtime

Before running any Node, npm, npx, Nuxt or test command, read `.nvmrc`, activate
that version with the available version manager (`nvm use` in this workspace),
and verify that `node --version` matches. The ambient shell runtime is not
authoritative.

## Fonts

Three faces, each with one job. **Josefin is the voice, Plex is what you read,
mono carries ticking digits.** Josefin was doing all three until 2026-08-16;
paragraphs and form controls set in it were handsome and hard to read.

### 1. Josefin Sans — the wordmark, headings and display sizes

*   **Weights**: `300`–`700`, one variable font.
*   **Self-hosted** from `public/fonts/` (three subsets: latin, latin-ext,
    vietnamese; 68 KB total). SIL Open Font License 1.1, see
    `public/fonts/OFL.txt`. Not linked from Google: the app is an offline-capable
    PWA, and owning the `@font-face` rules is what makes the metric override
    below possible.
*   **Role**: The wordmark, `.t-hero-num`'s neighbours, tool names in the menu,
    and anything set at display size. **Not** body copy, not form controls.
*   **CSS Variable**: `--font-display`.
*   **Note**: Josefin Sans has a small x-height, so its sizes run larger and its
    tracking tighter than the same role would need in a typical UI face. The
    smallest label in the interface is 11px, not 9px, for this reason.
*   **Do not** use weights outside 300–700; anything else is faux-bolded by the
    browser and looks smeared at label sizes.
*   **Do not** set a paragraph or an `<input>` in it. That is what Plex is for.

### 2. IBM Plex Sans — everything you read

*   **Weights**: `400`–`600`, one variable font.
*   **Self-hosted** from `public/fonts/` (same three subsets; 76 KB total). SIL
    Open Font License 1.1, see `public/fonts/OFL-IBM-Plex-Sans.txt`.
*   **Role**: `.t-body`, `.t-body-sm`, every form control, menu rows, modal
    prose. If someone reads it as a sentence, it is Plex.
*   **CSS Variable**: `--font-sans`.
*   **Why this face**: it is a humanist text face drawn for interfaces — large
    x-height, open apertures, letterforms that stay distinct at 13px on a phone
    in daylight. It contrasts with Josefin rather than competing: geometric
    display over humanist text is the pairing Deco layouts have always used.
*   It is preloaded ahead of Josefin in `nuxt.config.ts`, and precached by the
    service worker, because it is the face whose absence is felt.

### 3. Josefin Caps — uppercase labels only

*   Same font file, aliased with `ascent-override: 72.8%` (the measured cap
    height), `descent-override: 0%`, `line-gap-override: 0%`.
*   **CSS Variable**: `--font-caps`, used by `.t-label`, `.t-label-xs`, `.t-title`.
*   **Never use it for lowercase.** With no reserved descent, `g j p q y` hang
    outside the line box. Body copy stays on IBM Plex Sans.

### 4. System monospace — digits only

*   **Family**: `ui-monospace`, `SFMono-Regular`, `SF Mono`, `Menlo`, `Monaco`,
    `Consolas`, `monospace`.
*   **CSS Variable**: `--font-mono`.
*   **Role**: Any digit that changes or sits in an aligned column — solar phase
    times, coordinates, shutter speeds, the countdown.
*   **Why not Josefin**: Josefin Sans has no tabular figures. Measured at 40px,
    `00000` is 124.7px wide and `11111` is 65.9px, and `font-variant-numeric:
    tabular-nums` does not change that. Digits set in Josefin jump sideways as
    they tick and destroy column alignment.

## Type roles

Use these classes rather than raw size utilities. They are defined in
`@layer components`, so Tailwind utilities still override them per element.

| Class | Size | Use |
|---|---|---|
| `.t-label` | 12px caps | Eyebrows, field labels |
| `.t-label-xs` | 11px caps | Footer, map chrome, tight spots |
| `.t-title` | 14px caps | Panel headings |
| `.t-body` | 15px | Running copy |
| `.t-body-sm` | 14px | Secondary copy, help text |
| `.t-num` / `.t-num-sm` / `.t-num-xs` | 14 / 13 / 11px | Digits, tabular |
| `.t-hero-num` | clamp 28–40px | The countdown |

## Colour

`--color-ink`, `--color-ink-muted` and `--color-ink-faint` carry text colour and
flip with the theme. Prefer them over raw grey steps.

Accents are theme-aware: `--color-brand-glow-amber` (golden hour) and
`--color-brand-glow-cyan` (blue hour) are dark in light mode and light in dark
mode. A single shared value cannot clear 4.5:1 in both themes.

Tailwind only defines steps 50, 100, 200 … 900, 950. Invented steps such as
`gray-550` generate no CSS at all and silently fall back to inherited colour.

## Layout helpers

*   `.row-kv` — a label/value pair on one baseline. The label shrinks and
    ellipsizes; the value never wraps. Use it instead of
    `flex justify-between` for any label + value row.
*   `.tap` / `.tap-sm` — 44px / 38px minimum hit area, applied only under
    `pointer: coarse` so desktop density is unaffected.

    **An icon button on a container's edge must carry `justify-end`, not
    `place-items-center`.** `.tap` grows the box to 44px and centres what is in
    it, so a 20px icon ends up 12px inside the edge its container defines, and
    every modal's close button sat 12px left of the column it was supposed to
    align with. `justify-items-end` does *not* fix it: with `display: grid`,
    `.tap`'s own `justify-content: center` centres the whole track, and
    `justify-items` only positions the item inside a track that is already in
    the wrong place. `justify-end` moves the track. The hit area stays 44px;
    only the ink moves. Verified at 0.0px offset in `InfoModal`, `ApiKeyModal`
    and both icons in `AppMenu`.
*   `.safe-inset` — page padding that respects `env(safe-area-inset-*)`.

## Theme switching

The theme lives on `<html data-theme="light|dark">`, set by an inline script in
`<head>` before first paint and kept in sync by `useHead` in `app.vue`.

Do **not** switch the theme via `htmlAttrs.class`: `useHead` merges class
strings rather than replacing them, which produces `class="dark light"` and
makes every `dark:` variant match in light mode.

## Map

OpenLayers (`ol`), loaded lazily on the client. The app supplies its own zoom
buttons and hides OL's, so `controls` is built explicitly; only the attribution
control is kept, because the tile providers require it.

Map chrome occupies four corners that cannot collide: zoom top-left, offline
save top-right, basemap picker bottom-left, attribution bottom-right. All four
hug the border, and **none of them carries `.tap`**: the 44px floor is right for
a button on a page, but on a map it is taken out of the map itself. Every one of
these controls has a second route — pinch to zoom, and the basemap and the
offline save are one tap either way.

Below `lg` the search field, the date and the coordinates float **on** the map,
in the strip between the two top corners, so a pilot can tap a spot and read the
light without scrolling. From `lg` the same markup goes `static` and flows above
the map as its own card. One block, two positions — not two blocks.

The picker row shares its bottom line with the attribution, so it reserves 8rem
for it and scrolls sideways rather than growing over it. The attribution is
required by the tile providers and must never be covered.

**The map carries no minimum height below `lg`.** The solar page promises to fit
the viewport, so a floor is one the flex column cannot honour: it overflowed by
24px on a 667px-tall phone and the panel below was drawn over the map's own
bottom corner. The map takes the height the fixed rows leave it.

The default basemap is World. It followed the theme until 2026-08-17; a pilot
picks a launch site off the ground they will see, and light/dark answers a
question about the interface instead. A remembered choice still wins.

Tile URLs keep the `{z}/{x}/{y}` templates the service worker matches on by
hostname, so cached tiles survive. Subdomains use OL's `{a-d}` syntax.

The search field's requests live in `app/composables/usePlaceSearch.ts`, shared
with the sky view's search since 2026-10-10, so the two cannot drift apart. The
map keeps its own markup and only aliases the composable's names.

## Weather

**The picture goes on the map, the numbers go on one line, the detail goes in a
dialog.** The full `WeatherWidget` is 220px tall and the solar page has to fit a
phone screen, so on a phone it is not on the page at all.

*   **Overlay** — OpenWeatherMap **Weather Maps 1.0** tiles
    (`tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=`), added as a
    second OL layer at `zIndex: 5`: `clouds_new`, `precipitation_new`,
    `pressure_new`, `temp_new`. Verified against a free key on 2026-08-17;
    **Maps 2.0 answers 401** without a paid plan, so do not reach for it.
*   Weather tiles have a native **maximum zoom of 10**, while the map and its
    basemap may still reach 19. OpenWeather returns valid high-zoom PNGs, but
    their weather model has no street-level detail: measured at one location,
    pressure and temperature fell to three and five colours at zoom 12 and one
    colour each at zoom 19. OpenLayers must overzoom the last useful weather
    tile instead of requesting that false detail.
*   Rain stays on the recommended `precipitation_new` layer. Its PNG already
    carries very weak alpha — in one live central-Europe tile the mean was
    0.7%, before our 65% layer opacity reduced it again — so every downloaded
    rain tile is processed once. Provider alpha is raised to a zoom-dependent
    power: 0.5 at Europe zoom 4, easing to 0.7 at regional zoom 10. Zero remains
    exactly zero, one remains one, and intensity order is unchanged. The Rain
    slider remains 0–100% and is applied afterward as the final authority over
    the layer's strength.
*   Pressure and temperature default to **45%**, cloud and rain to 65%: those
    two paint every tile edge to edge rather than only where there is weather,
    so at 65% they bury the ground.

### Wind is ours, and it needs no key

`wind_new` was dropped on 2026-08-17. Measured on one of its tiles: **74% of
pixels painted, twelve distinct colours, not one arrowhead** — it encodes SPEED
as a colour wash and carries no direction at all, and at ordinary European wind
speeds it is very nearly invisible. It is not a wind map, it is a heat map.

The Wind layer now draws an **arrow field from Open-Meteo** (`useWindField.ts`),
an 8×8 grid across the visible extent, refetched on `moveend` behind a 450ms
debounce, with the in-flight request aborted so a fast pan cannot paint a stale
extent over a new one.

*   **No API key.** Open-Meteo takes comma-separated coordinate lists: 64 points
    in 397ms from the browser, 400 points in 844ms.

**The grid size is limited by quota, not by bandwidth.** Open-Meteo charges per
**location**, not per request: a 144-point grid is 144 calls against a
5,000-per-hour budget, so roughly 34 pans would lock a user out for the hour.
Found the hard way — `429 Hourly API request limit exceeded` during development.
Three things keep it inside the budget, and none may be removed:

*   **8×8, not 12×12.** The grid was raised to 12 for the particle layer and put
    straight back.
*   **A movement threshold.** Refetch only once the centre has moved more than a
    third of the visible span or the zoom has changed by more than 1.4×.
    Nudging the map a few pixels used to cost a full grid.
*   **A ten-minute cache, and a ten-minute cooldown after a 429.** Wind does not
    change in ten minutes, and the quota window is hourly, so a fast retry only
    burns what is left of it.

### Arrows or motion, never both

`app/utils/windParticles.ts` advects particles through the interpolated field and
fades their trails, and **particle speed is proportional to wind speed** — that
is the reason it exists. A field can point one way across a whole city and still
differ by 30 km/h across it; a static arrow cannot say so, a streak that crosses
the screen in two seconds instead of twenty can. Robert corrected me on this,
and he was right.

**A particle moves at its own ground speed, scaled by `TIME_LAPSE` and by
nothing else.** The first version normalised each field so its *fastest*
particle crossed the view in six seconds — which made a 10 km/h breeze look
exactly like a gale, and made the apparent speed independent of zoom. Both were
wrong, and both were reported. The rule now:

*   **Ratios are exact and are never touched.** 40 km/h is four times 10 km/h on
    the same screen, at every zoom. Verified 3.97× at city zoom and 3.79× at
    continental zoom for a 3.77× speed difference.
*   `TIME_LAPSE` is 90, not 300. 300 was tried and still looked like a storm,
    because it happened to reproduce what the broken normalisation produced.

**Pure ground speed alone does not survive zooming out**, which is the second
thing that was reported. Measured over Europe: cells ranged 0.4 to 37.7 km/h,
and the *fastest* still needed 26 minutes to cross the map. Everything looked
equally frozen — hiding precisely the differences the layer exists to show.

So the whole field is multiplied by **one** factor, chosen to bring its peak
into a readable band (25–120 px/s). One factor for every particle is the entire
trick: the ratios between them come through untouched, and only the overall pace
follows the zoom. At city zoom an ordinary wind already lands inside the band, so
the factor is about 1 and the motion is the honest ground speed; the correction
only bites where the honest answer is unusable. The upper bound stops a 90 km/h
storm at city zoom from smearing.

Never scale an individual particle by anything other than its own speed. The
per-field factor is the only permitted correction.

The two modes are **mutually exclusive**. Drawn together, the streaks pass over
the arrowheads and neither shape stays legible. The switch is a button on the map
directly under the wind button, shown only while the wind layer is on — not a
row in the settings drawer, because it is a choice you make while looking at the
thing it changes. Stored as `dpt:wind-animate`, defaulting to **arrows**: they
cost no animation loop and they carry an exact bearing.

Continuous motion needs its own `requestAnimationFrame` loop calling
`map.render()`, because OpenLayers only redraws when it believes something
changed. It stops when the layer is off, when the mode is arrows, and when the
tab is hidden.

Trails are faded with `globalCompositeOperation = 'destination-in'` and a
translucent fill, which multiplies existing alpha instead of painting a colour —
the map has to stay visible underneath. The canvas is only resized when the size
truly changes, since resizing clears it, and it is cleared outright whenever the
view centre, zoom or rotation changes, because trails belong to the view that
drew them.

## The map remembers where it was looking

Centre and zoom are stored under `dpt:map-view` on every `moveend` and restored
when the map is built. The marker's position was already remembered; the view was
not, so every reload snapped back to the marker at zoom 12 and threw away
wherever you had panned to.

**A remembered view beats the marker.** Panning away from your own marker is a
deliberate act, and a reload must not undo it.

The initial read uses `readPersisted`, not the ref's own value: `usePersistedRef`
restores on mount and the map is built inside an *async* mount hook, so reading
the store directly removes any question of which happens first.

The zoom level is shown between the + and − buttons, where the controls that
change it already are — it replaced the hairline that separated them, so it costs
almost nothing on a map with no room to spare.

### Tapping the map does not move the map

**A tap picks a spot and leaves the view exactly where it is.** It used to
recentre on the point you tapped, which shifts the ground out from under your
finger and makes the next tap land somewhere you did not choose. `skipNextRecenter`
marks a location change as having come FROM the map; the watcher reads and clears
it *before* its own early exit, or the flag would be spent on whatever changed
the location next — a search result that then silently refused to move the map.

Recentring is still right for a location that came from somewhere else: a search
result, the GPS button, a remembered position.

### The wind reading is a deliberate gesture

`12 km/h · gust 25`, interpolated at the point asked about, on **shift-click or a
450ms long press only**. On every tap it covered the map it was describing. A
press that moves more than 10px is a pan and abandons the question, and a
completed long press suppresses the click OpenLayers then synthesises, so asking
about a spot never also selects it.

It stays until its **close button** is pressed. It used to dismiss itself after
four seconds, which snatched the number away mid-read. It flips below the point
when the point is near the top edge, since the map clips its own overflow.

**The browser's context menu is suppressed over the wind layer, and only there.**
A long press is our gesture there, and the native menu answered it as well. That
is not only ugly: the menu interrupts the pointer sequence underneath it, so the
`pointerup` OpenLayers is waiting for never arrives, its view is left with an
interaction still open, and **mouse-wheel zoom stops responding**. The map
container also carries `select-none` and `-webkit-touch-callout: none` while the
layer is on, and every pointer listener here is `passive` so none of them can get
in the browser's way on a pinching touch surface.

The chip remembers the **coordinate**, not the pixel, and recomputes its position
on `moveend`: a pixel is only true for the view that measured it.
*   Rejected: **api.met.no** answers one point per request and wants an
    identifying User-Agent a browser may not set; **api.weather.gov** is
    keyless and global-looking but **404s outside the United States**.
*   Free for non-commercial use, ~10,000 calls a day, CC-BY 4.0 — hence
    `Wind © Open-Meteo` in the attribution dialog whenever the layer is on.
*   **Arrows point where the wind BLOWS**, so the reported bearing is turned
    through 180° before drawing. Meteorology reports the direction wind comes
    FROM and aviation reads it that way, but an arrow on a map is read by
    everyone else as the way the air is going. Robert chose this explicitly
    after first asking for the aviation convention.
*   Because it needs no key, **Wind is offered even with no key configured** —
    `availableWeatherLayers` filters on `needsKey`. A pilot with no key still
    gets the one reading that decides whether to launch.
*   Speed is carried by colour *and* size, so the field reads without learning
    the colour ramp. Four cached SVG data URIs serve all 64 arrows.
*   These tiles are deliberately **not** cached. `sw.js` matches on hostname and
    lists only the three basemap hosts. A cached picture of where the rain was
    yesterday is worse than no picture.
*   **`WeatherStrip.vue`** rides on the coordinates line inside the search
    panel, so it costs no height. Cloud cover always; rain or snow only when
    there IS precipitation, because zero millimetres is the normal case and
    printing it every day spends the width the wind reading needs on the day it
    matters. Tapping it opens the full widget in a dialog, where `bare` drops
    the card chrome. The full Weather Conditions dialog always carries an
    explicit precipitation row: `None`, `Rain`, `Snow`, or `Rain + snow`, with
    hourly intensity and forecast probability when OpenWeather provides it.
*   The full dialog also shows **humidity**, **pressure movement**, and the
    **time represented by the data**. Pressure compares the selected reading
    with the forecast block nearest six hours later; at the end of the forecast
    it falls back to the block nearest six hours earlier. Under 1 hPa is
    `steady`; otherwise it reports `rising` or `falling` with the change and
    interval. Invalid or missing pressure is omitted, never rendered as zero.
*   A current observation reads `Updated 14:20 · 8 min ago`; a future value
    reads `Forecast 18:00 · 3-hour block`. The clock is converted with the
    location's OpenWeather timezone offset, not the browser's timezone.
*   Drone safety is classified from OpenWeather's numeric condition code, not
    its English description. Descriptions may be translated; the code remains
    stable. Thunderstorms, squalls and tornadoes report severe weather, while
    drizzle, rain and snow report precipitation.
*   Cloud and rain lead, not wind. **This tool is as much for photographers as
    for drone pilots**, and what the sky is doing outranks how hard it blows.
*   Wind and gust share one icon and read as a range, `18–29`. They are the same
    measurement, steady and peak. The range collapses to one number when they
    are equal — OpenWeatherMap omits `wind.gust` on calm days and `useWeather`
    falls back to the steady speed, so a naive range would print `18–18` most of
    the year and train the reader to ignore it.

### Three readings that are not fetched as such

*   **Visibility** was already in every response and unused. It is the haze
    number: 10 km is OpenWeatherMap's ceiling, not the sky's limit.
*   **Fog risk** is derived, not fetched — `dewPoint()` in `useWeather.ts`,
    Magnus-Tetens over the temperature and humidity already in hand, so it costs
    no request. The number that matters is the *spread* between air temperature
    and dew point: under 1.5°C the two have met and you get mist at first light.
*   **Air quality** is a third endpoint (`/data/2.5/air_pollution`, free). It is
    started but **not awaited and never thrown from**: it is one endpoint
    further from what the user opened the tool for, so it must not delay or fail
    the wind reading. Shown for the haze PM2.5 predicts, not for health advice.

    Its unit carries `normal-case`. `.t-label-xs` uppercases, and uppercasing
    `µg/m³` renders `MG/M³` — MICROgrams shown as MILLIgrams, a thousandfold
    error in two letters. Any unit whose meaning depends on its case needs this.
*   No key means no button, no strip and no weather credit. A remembered layer
    choice survives, so adding a key later brings the overlay straight back.
### Overlay strength lives in Settings

`useWeatherOverlay()` holds one opacity per layer, persisted under
`dpt:weather-opacity`. It is `useState`-backed for the same reason `useApiKey`
is: the sliders are in the settings drawer in the layout and the layer they move
is in the map on the page. **`usePersistedRef` would not work here** — it
deliberately gives every caller its own ref, so the slider would move nothing.

Values are clamped on the way in. localStorage is user-writable, and an opacity
of `9999` or `"banana"` must never reach OpenLayers.

The map keeps only the switch. How heavily cloud is painted is a taste you set
once; which layer is on is a decision you make while planning.

## Tooltips

`v-tooltip="'Save the visible map'"`, from `app/plugins/tooltip.ts`. It replaces
the native `title` attribute everywhere, and `title` should not come back: the
browser draws it in the OS font after a delay it owns, it cannot be styled, and
**it never appears on a touch screen** — so the one place a native tooltip does
nothing is the phone in the field where the explanation is needed most.

*   **Icon-only buttons only.** A tooltip on a button that already shows its
    label is the same word twice.
*   **Touch: long-press**, 450ms, and the press **cancels the click**. Without
    that, asking what the offline-save button does would also download 150 map
    tiles. A finger that moves cancels the press — that is a map pan.
*   One shared element for the whole app, `position: fixed`, flipped below the
    button when there is no room above and clamped to the viewport. A node per
    button would be twenty idle nodes, each needing to escape whatever
    `overflow: hidden` its parent has — and the map crops its own chrome.
*   The surface is `--color-ink`, so it inverts with the theme by itself and
    stays legible over a satellite photograph, which has no palette to rely on.
*   **Focus opens it only when it is keyboard focus** (`:focus-visible`). A
    dialog that moves the focus to its close button after a click must not pop
    that button's tooltip; tabbing to it still shows the label at once. Added
    2026-10-11, when the sky view's close button showed its tooltip on every
    opening.

## Attribution

**The app draws its own, and it is a button and a dialog** — the ⓘ in the map's
bottom-right corner, opening `InfoModal` with one line per active source.
`attributionLines` composes it from the current basemap plus the weather layer
if one is on, so it is never a stale hand-written list.

OL's `Attribution` control is therefore not constructed at all, and the 69 lines
of `.ol-attribution` CSS that styled it are gone. Do not bring either back.

The strip was tried first and does not survive a phone. With the weather overlay
on, two credits measure 231px beside a 192px basemap picker inside a 356px map;
they cannot share the bottom line at any size that stays legible, and 8px type
across the foot of the map was the worst of both. The credit is **required by
the tile providers**, so it must stay one tap away and must never be removed —
but one tap is what the rest of this app's secondary text costs too.

## Secondary text belongs in a modal

*Robert's rule, given twice — for the ND panel and again for the app menu.*

**A screen carries the thing you came for. Everything that explains it goes
behind an ⓘ button that opens a modal.** Notes under a control, descriptions
under a menu item, "here is what this means" paragraphs: all of it moves out.

The reason is that explanatory text does not scale. One note under one menu
item looks harmless; seven tools means seven notes, and the menu no longer fits
a phone. The cost only shows up later, which is exactly why it has to be a rule
rather than a judgement call each time.

Use `InfoModal.vue` — a titled dialog with a content slot, teleported to body.
`PhaseInfoModal.vue` keeps its own file because its content is a structured list
with highlight behaviour.

**An ⓘ next to a link must be its sibling, never its child.** A `<button>`
inside an `<a>` is invalid HTML and its click bubbles into the link, so tapping
the icon navigates instead of explaining. Make the row a flex container holding
both: the link grows to fill it, the button sits at the end.

Watch for `.tap` on that link. It sets `justify-content: center` for icon
buttons, and a link that inherits it centres its own label. Add `justify-start`.

**A dialog opened from inside the menu passes `elevated`.** The menu panel sits
at `z-7000`; `InfoModal` defaults to `z-6000` and would render behind it.
`elevated` raises it to `z-8000` so the menu stays open underneath and the
reader keeps their place in the list. Dialogs opened from the page — Settings,
About ND filters — are owned by the layout and need no such flag.

## Explanatory copy

Phase explanations live in `PhaseInfoModal.vue` and nowhere else. Cards show
times and state; they never carry a paragraph explaining what a phase *is*,
because that text pushes the numbers a pilot is reading off the screen.

The modal is a controlled dialog: `v-model:open` plus an optional `highlight`
prop taking a solar segment name (e.g. `"Evening Blue Hour"`). It groups the
six segments the model emits into five entries, since the morning and evening
variants of golden and blue hour describe the same light.

It is opened from two places: the **Light phases** row in the app menu, and any
segment on the day-schedule track in `DaySchedule.vue`, which passes that
segment as the highlight. The panel header it used to sit behind is gone — it
was the tallest thing on a phone screen and told a pilot nothing.

Its shell IS `InfoModal`. It drew its own until 2026-08-17, which rose from the
bottom of a phone and was measured against the large viewport, so it hung below
the fold and grew a second scrollbar behind itself. One answer to that problem
is enough.

## The solar panel is three components, not one

`DaySchedule.vue`, `LightState.vue` and `LightWindows.vue` were one
`SunTimeline.vue` until 2026-08-17. They split because on a phone the **map sits
between the schedule and the state cards** — the order a pilot works in: what is
the day doing, where am I, what is the light doing now. One component cannot
have another component inserted into its middle.

`pages/solar.vue` places them. Below `lg` the reading column is `display:
contents`, which dissolves the wrapper so its children become rows of the page
itself and `order` can interleave the map; from `lg` it is a real scrolling
column again and the two-column layout returns.

The two blocks that tick both use `useNow()` — one ref per component, updated
each second. Not a shared clock: nothing compares one component's `now` against
another's, and a module-level ref would leak between requests under SSR.

`LightWindows` renders in two places on purpose: inline under the state cards on
a desktop, and inside a dialog behind the **Light windows** link on a phone,
where the four blocks a pilot came for must fit one screen.

## Today is the reader's today

The solar page opens on `toLocalDateString(new Date())` from
`app/utils/localDate.ts`, never on `toISOString()`. That one is UTC: in Vienna it
opened the page on yesterday's date between 00:00 and 02:00, which the sky view
then read as "another date", so its sun stood still at noon.

An open page follows today across midnight — checked once a minute, and again
when the tab becomes visible after a phone or laptop slept — **but only while it
is showing today** (`followToday`). Robert's rule, 2026-10-11: a date picked on
purpose, such as next Saturday's shoot, must not jump away at midnight.

## Sky view

The orbit button in the Day Schedule header opens a full-screen 3D view of the
day: a small planet, the sun's path as a bow over the selected place, and fans
from the place to the golden and blue parts of the bow. Two bows (the true sky
path, and the bar bent into a clock) and two planets (NASA Earth, a dot globe),
each remembered (`dpt:sky-bow`, `dpt:sky-planet`). Spec:
`docs/superpowers/specs/2026-10-10-sky-view-design.md`.

*   **It explores; it never moves the page.** A place picked in the view stays
    there. Closing it leaves the solar page and `dpt:lat`/`dpt:lng` untouched.
    Robert's rule: comparing places must not overwrite a launch site.
*   **Fan times come from `getSolarSegments()`**, and the planet's twilight
    bands from `SOLAR_ALTITUDES`. The view must never disagree with the bar.
    Its polar-day and polar-night note is `useSun().getPolarExplanation()`,
    the same words `LightWindows` shows.
*   **Its images are ours.** `public/textures/` holds the NASA Earth day and
    night images and the land mask the dot globe reads; `SOURCES.md` there
    records each source and the rebuild commands (`scripts/build-land-mask.mjs`
    plus ImageMagick). Same origin, so the service worker caches them the first
    time the view opens. A first opening offline falls back to Dots with a note.
*   **Time labels sit at their fan tips in screen space**, a fixed number of
    pixels out from the tip, stepping aside for the pin, the sun, the planet and
    each other (`app/utils/sky/labels.ts`). Fixed world-space offsets were tried
    first: they collided on a phone and floated 100 px away on a desktop.
*   **There is no time scrubber, on purpose.** On one place the fans already
    show the whole day; changing the place is what shows something new.
*   **The Clock's sun wraps; the Day Schedule needle stops.** The bar's needle
    stops at the ends of its day, but the sky view's Clock shows the sun where
    it is in its own solar day (wrapped), so near midnight the two can differ.
    Both are night.
*   **The stage is always dark**, via `data-theme="dark"` on the overlay root.
*   **Three.js is imported only when the view opens**, from `app/utils/sky/`.
    `SkyView.vue` reaches it through `import()` and `import type` only. Keep it
    out of the entry chunk.
*   **No bloom pass.** Glow is additive sprites and shaders; a bloom pass
    doubles the fill cost on a phone.
*   **Adding something to the stage is one entry in `layers`** in
    `app/utils/sky/scene.ts`: a `SkyLayer` gets the model, the bow mode, the
    sun and the opening timeline, and glides with `Morph`.

## Routing

Each tool is a page under `app/pages/`, listed once in `app/data/tools.ts` with
its `path`. `/` redirects to the first tool, so no tool is the accidental
default and every one has a URL a pilot can bookmark or share.

`app/app.vue` holds only `<NuxtLayout><NuxtPage /></NuxtLayout>`. The chrome —
background, header, menu, modals, footer, service worker — lives in
`app/layouts/default.vue`. A tool owns its own state: location, date and weather
belong to `pages/solar.vue`, not to the shell.

**Which tool is active is read from the route**, never stored. It was a
persisted `dpt:active-app` ref before routing; a stored copy would be a second
source of truth that disagrees with the URL on a deep link. That key may still
sit in a returning user's storage and is simply ignored.

Two things must be shared between the layout and a page. Each has a composable
backed by `useState`, not a module-level ref, which would leak between requests
under SSR:

*   `useTheme()` — the resolved light/dark boolean. The layout paints the shader
    with it, the menu switches it, the solar page hands it to the map. The
    three-way choice (light / dark / follow the system) stays inside
    `ThemeToggle`, which owns the `color-theme` key and the media listener. It
    is a popup, not a row of three: the trigger is a bare icon showing the mode
    you are IN, and the other two open upwards from it, because the control sits
    on the bottom edge of the screen. A row of three was always two-thirds
    wrong, and its bordered pill spent a footer's worth of space saying so.
*   `useApiKey()` — the OpenWeatherMap key. The settings drawer in the layout
    writes it; `useWeather()` in the solar page reads it.

## Persistence

`usePersistedRef(key, fallback)` in `app/composables/usePersistedRef.ts` backs a
ref with localStorage under the `dpt:` namespace. Remembered today: basemap,
location, and the ND tool's metered reading, frame rate, shutter
angle, target mode, selected gear (`dpt:nd-gear`) and whether the outcomes
table is expanded to show every filter (`dpt:nd-show-all-filters`), and the sky
view's bow and planet (`dpt:sky-bow`, `dpt:sky-planet`). Theme uses its own
older `color-theme` key.

`dpt:nd-gear` stores a `GearEntry.id` from `app/data/gear.ts`. Those ids are
persisted on real devices, so an id must never be renamed in place — a rename
silently strands a returning user back on "Other / camera not listed".
Retiring an entry means removing it from `gearEntries`, not repurposing its id.

The restore runs **on mount, never during setup**. Reading storage during setup
makes the client's first render disagree with the server's HTML, and Vue does
not repair that in production — the stored value silently fails to apply.
Use `readPersisted()` for a one-off read outside a ref.

## Centring all-caps text

A font reserves `ascent + descent` on every line whether the glyphs use it or
not. Uppercase never reaches below the baseline, so that reserved descent is
always empty and any centred box puts the letters high — measured at **1.67px**
for Josefin Sans at 11px. The error is `(descent - ascent + capHeight) / 2`,
which has no line-height term, so `line-height` cannot fix it.

**Fix: the "Josefin Caps" alias** (see Fonts above) removes the reservation at
the font level, so the line box becomes the block of capitals and ordinary
symmetric padding centres it. Every caps button now measures under 0.2px off
centre. The residual is round-letter overshoot, which is intended.

Two approaches were tried and rejected:

*   **Asymmetric padding** (`pt-2 pb-1.25`) works, but hard-codes a value tuned
    to one font at one size, in every call site.
*   **`text-box: trim-both cap alphabetic`** is purpose-built but is **not an
    inherited property**. On a flex container it lands on the container while
    the text lives in an anonymous flex item that never receives it — so it
    silently does nothing on a button. It also has no Firefox support yet.

When verifying, note two traps: a zero-size baseline probe appended to a flex
container measures the flex centring point, not the text baseline, and
`Range.getBoundingClientRect()` reports the line box rather than the letters.
Compute the ink position from font metrics instead.

## Baselines

Rows that mix font sizes or font families must use `align-items: baseline`, not
`items-center`. `items-center` aligns box centres, so 12px text next to 14px
text visibly sits at different heights. Where a label and a value belong
together in a sentence, prefer one inline run in a single element — inline text
shares a baseline by construction and wraps as prose instead of as columns.

## Text inside an SVG

A `font-size` written in px inside an SVG is **a viewBox unit, not a screen
pixel**. The viewBox transform scales it along with the rest of the drawing, so
the tick labels in `FrameRateDial.vue`, set to `9px`, were drawn at 17px on a
412px dial and at 25px on a desktop one.

Container units make this worse rather than better. A `cqw` is itself a share of
the width, so a size written in `cqw` inside an SVG grows with the *square* of
the element. The stylesheet claimed the opposite for months.

To hold one apparent size, measure the element and convert:
`units = screenPx × viewBoxWidth / elementWidth`. `FrameRateDial.vue` does this
from the width its own `ResizeObserver` reports and sets `font-size` as an
attribute — which is why `.dial-tick-label` in `main.css` carries no size of its
own. A stylesheet rule would win over the attribute and undo it.

## ND tool product rules

*Decided by Robert on 2026-08-16, from the evidence in
`_MATERIAL/camera-presets-fact-check-sources.md`. These bind the ND filter mini
app. Change them here, not in a plan document.*

**1. The camera model is never a mathematical input.**

When the user enters the exposure their camera actually metered without a
filter, that reading already contains their ISO and their aperture. Nothing
about the body or aircraft needs to enter the sum. Base ISO, dual base ISO and
sensor profiles are therefore not modelled, and a camera preset must never
change a calculated number.

**2. Listing a camera claims one thing only: an ND solution exists for it.**

A model earns a place when a manufacturer or a trustworthy accessory vendor
confirms at least one physical ND solution — an external model-specific filter,
an internal ND system, or ordinary lens-mounted use on an interchangeable-lens
body. The app does not model the attachment. Every entry carries an evidence
URL, a source type and a checked date. A model that cannot be confirmed goes in
an `unverified` collection with the reason, never into the list on inference.

**3. No strength may become unreachable.**

Picking a camera must not narrow what the user can choose. Filters outside the
selected model's known set may start collapsed behind a one-tap "show all", but
they must always be one tap away.

This clause was originally written as "must not hide strengths". It was
loosened on 2026-08-16: the strict reading forced ten filter buttons onto a
390px phone where four would do, and the risk it guards against is
unreachability, not visibility. Third-party makers such as Freewell and
PolarPro sell strengths the aircraft's own maker does not, so a pilot must
always be able to reach one.

**4. The result is never snapped to a commercial kit.**

The calculator recommends from the full ND range and reports the leftover
error honestly — "you need 5.3 stops; ND32 gives 5, so you are 0.3 over".
Rounding the answer to whatever DJI happens to sell would silently present one
vendor's catalogue as the limit of what is possible.

**5. Store attenuation as stops.**

Stops are canonical. Derive the filter factor with `2 ** stops` and the
transmission with `2 ** -stops`. `ND1000` is a display alias for the nominal
ten-stop class, whose exact factor is 1024; every maker markets it as ND1000,
so the label follows the product, not the arithmetic.
