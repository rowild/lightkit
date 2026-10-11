# Changelog

## [Unreleased]

## [0.0.14] - 2026-10-11

### Added

- **The sky view: the day in 3D.** The orbit button in the Day Schedule header
  opens a full-screen view of a small planet with your place on top. The sun's
  path for the day stands over it as a bow, and fans of amber and cyan light
  reach from the place to the parts of the bow where the light is golden or
  blue. A low, flat bow shows at a glance why golden hour lasts longer in
  Reykjavík than in Quito.
- **Two bows and two planets.** Sky path draws the sun's true path across the
  sky; Clock bends the Day Schedule into a half circle, morning on the left, and
  the two glide into each other. Earth is NASA's Blue Marble by day and Black
  Marble city lights by night; Dots draws the land as a field of petrol dots.
  Both planets glow along the bands where golden and blue hour are happening,
  and both choices are remembered.
- **The sun's strengths.** A bead marks every full hour, larger and brighter
  the higher the sun stands. The sun itself sits at the current moment on
  today's date and moves live; on any other date it marks solar noon. Every
  golden and blue fan carries its times at its tip.
- **Explore other places without losing your own.** Tap the planet or search by
  name: the planet rolls the new place to the top and the bow morphs into its
  day. My place jumps back, and closing the view leaves the solar page and your
  saved location exactly as they were.
- **An open solar page follows today across midnight** — but only while it is
  showing today. A date you picked on purpose stays where you put it.

### Changed

- **The map and the sky view share one place search.** Same requests and the
  same names as before; a slow answer for an earlier search can no longer
  overwrite a newer one.
- **Tooltips open on keyboard focus only.** A dialog that moves the focus to its
  close button no longer pops that button's tooltip every time it opens.

### Fixed

- **The solar page opens on today's date around midnight.** It read the date in
  UTC, so in Vienna it opened on yesterday's date between 00:00 and 02:00.

## [0.0.13] - 2026-08-23

### Added

- **Weather Conditions says what the precipitation is doing.** Rain and snow
  now appear separately with hourly intensity, mixed precipitation keeps both
  rates, and forecast readings include OpenWeather's probability. A dry report
  says `None` instead of silently omitting the subject.
- **Humidity, pressure movement and source time in the full weather report.**
  Pressure is paired with its rising, steady or falling movement over roughly
  six hours. Current observations show when they were updated; forecasts name
  the exact three-hour block, both in the selected location's local time.

### Changed

- **Drone safety now reads OpenWeather condition codes instead of English
  description text.** Translated descriptions can no longer hide rain, snow or
  a thunderstorm from the go/no-go verdict.

### Fixed

- **Rain on the map is visible at useful planning scales.** OpenWeather's
  recommended precipitation tiles bake very low transparency into light rain,
  and the app's strength slider reduced it a second time until a rainy Europe
  could look dry. LightKit now lifts only the provider alpha, more strongly
  when viewing a continent than a region; dry pixels stay transparent and the
  existing 0–100% Rain slider still governs the final strength.
- **Weather overlays stop requesting false street-level detail.** Their native
  tile pyramid now ends at zoom 10 and is enlarged above it, while the basemap
  and map itself continue to zoom to 19.

## [0.0.12] - 2026-08-17

### Added

- **Weather on the map.** A button under the zoom controls draws cloud, rain,
  pressure or temperature over the basemap, from OpenWeatherMap's tile service.
  Each layer has its own strength slider in the settings drawer, remembered
  between visits; pressure and temperature start weaker than the others because
  they paint every tile edge to edge rather than only where there is weather.
- **A wind field that needs no API key.** OpenWeatherMap's own wind layer turned
  out to be a colour wash of speed with no direction in it at all — measured on
  one of its tiles: 74% of the pixels painted, twelve colours, not one arrowhead.
  The Wind layer now draws a real arrow grid from Open-Meteo instead, which asks
  for no key, so it works even for someone who has never set one up. Arrows point
  the way the wind blows, and carry speed in both their colour and their size.
- **The wind can move.** A second button switches the arrows for a flowing
  particle field. Particle speed is proportional to wind speed, so a gale and a
  breeze no longer look alike — which is the whole reason to animate it. Arrows
  or motion, never both: drawn together the streaks cross the arrowheads and
  neither stays legible.
- **Shift-click or long-press the map to read the wind there** — `12 km/h · gust
  25`, interpolated at that exact point, in a small panel with a close button.
- **The weather in one line, on the map.** Cloud cover, rain when there is rain,
  and wind gusting to its peak, riding on the coordinates line so it costs no
  height. Tap it for the full report.
- **Three readings that were missing.** Visibility, which is the haze number and
  was already in every response but unused; fog risk, computed from the gap
  between air temperature and dew point, so it costs no request at all; and air
  quality, because PM2.5 is what turns distant hills grey.
- **Every icon button explains itself.** Hovering — or holding, on a phone —
  shows what it does. The offline-save button, which nobody could guess at, now
  says "Save the map you can see now, so it still works with no signal".
- **The map remembers where it was looking.** Centre and zoom survive a reload,
  and the zoom level is shown between the + and − buttons.

### Changed

- **The solar planner was rebuilt for a phone.** The map used to sit below the
  fold, so tapping a spot and reading its light meant scrolling between the two.
  The day schedule, the map, the current state and the next window now share one
  screen with no scrolling at all, in that order. Text and spacing came down
  throughout; the running clock moved inside the schedule bar; the search field,
  the date and the coordinates moved onto the map itself.
- **The next window shows when it ends, not only when it starts.** A start time
  says when to be there and nothing about how long you have once you are, which
  for a golden hour lasting twenty minutes at one latitude and two hours at
  another is the more useful half.
- **The countdown leads both state cards**, with the times beside it, and the
  window's own colour carries through to its times.
- **The pulse only pulses for light worth flying for** — golden and blue hour,
  in that hour's colour. A dot that beat through the whole day said nothing.
- **The theme switch is one icon, not three.** It shows the mode you are in and
  opens the other two upwards; the bordered pill around it is gone.
- **Light phases moved into the menu**, and the panel heading that used to carry
  it — the tallest thing on a phone screen — went with it.
- **The map opens on World**, and the basemap buttons read World, Terrain,
  Night, Day. It no longer follows the interface theme: a pilot picks a launch
  site off the ground they will actually see.
- **The map's own controls are much smaller** and sit against its edges, and the
  attribution moved behind an ⓘ rather than spanning the foot of the map.
- **Tapping the map no longer moves the map.** It used to recentre on the point
  you tapped, which shifts the ground out from under your finger and makes the
  next tap land somewhere you did not choose.
- **The footer stays on the bottom edge** of both tools, and never scrolls away.

### Fixed

- **Dialogs always fit the screen.** The light-phases dialog drew its own shell
  and hung below the fold; it now uses the same one as every other dialog.
- **The close button in dialogs lines up** with the content beneath it. The 44px
  touch target was centring the icon 12px inside the edge it was meant to meet.
- **The calendar icon in the date field is visible again.** The browser already
  draws that glyph light in dark mode — an earlier attempt to brighten it was
  inverting a white glyph to black.
- **The day schedule bar's corners match.** Its segments were rounder than the
  box holding them, from a pixel value left behind when the corner scale changed.
- **The map no longer overflows on a short phone**, where it kept a minimum
  height the layout could not honour and was drawn over the panel below it.
- **Air quality reads µg/m³, not MG/M³** — the label style was uppercasing the
  unit, turning micrograms into milligrams.
- Twenty pixels of every phone screen were being spent on an empty leftover
  element in the layout.

## [0.0.11] - 2026-08-17

### Added

- **Six handheld cameras in the gear list** — the DJI Osmo Pocket 3, Osmo Pocket
  4, Osmo Pocket 4P, Osmo Action 5 Pro and Osmo Action 6, and the Insta360 Luna
  Ultra. Each was checked against a current filter set before being listed, as
  product rule 2 requires. The Pocket 3 and the Action 5 Pro had been sitting in
  the "Not in the list" box marked as unresearched; they are now in the list
  proper. The Pocket 4P is the one entry whose set comes from Freewell rather
  than its own maker, because DJI publishes none for it.

### Changed

- **The numbers around the dial are far smaller, and they now hold one size.** A
  font size written in px inside an SVG is a drawing unit, not a screen pixel,
  so every value the stylesheet set was stretched along with the dial — the
  labels read at 17px on a large phone and at 25px on a desktop. The container
  units meant to tame that made it worse, growing with the square of the width.
  The dial now measures itself and converts, so the labels sit between 7.5px and
  10.5px at every size.
- **The dial sits in the middle of the space it is given.** On a screen tall
  enough that the dial is limited by its width, the leftover height used to pile
  up underneath it. It is now split evenly above and below.
- **The panel's wording was rewritten.** The legend under the filter list began
  mid-sentence — "marks a strength sold for the Mavic 3 Pro" — leaving the
  reader to supply the missing subject from the coloured dot beside it. That
  line and eleven others now read as plain sentences: "Filter lands" became "How
  close it lands", "Your camera already meters slower" became "No filter
  needed", and "Aperture now" became "Your aperture".

## [0.0.10] - 2026-08-17

### Changed

- **The gap between the aperture slider and the dial is gone** — 60px down to
  12px. Most of it was empty margin baked into the dial's own drawing: the
  track stops short of the bottom on both sides, so the dial is wider than it is
  tall, but it was being drawn inside a square. The rest was slack, which now
  falls below the dial rather than being split above and below it.
- The dial is bigger for it. Its ring went from 209px to 239px across on a large
  phone, and from 88px to 132px on a small one.
- **The numbers around the dial are smaller again**, capped at 9px rather than
  11px. The "fps" on the two ends is dropped on a dial under 260px, where it no
  longer fits.

## [0.0.9] - 2026-08-17

### Fixed

- **Dialogs stay on the screen.** A long one — the gear list — was drawing
  1524px tall inside a 667px phone, so the page itself scrolled *and* the
  dialog scrolled inside that. Its height cap was written as a percentage of a
  box that the dialog was itself sizing, so it never applied. Dialogs are now
  capped against the viewport directly and only ever scroll inside.
- **The dial no longer runs off the right edge** on phones wider than about
  410px. It was drawing 460px wide in a 408px column, for the same reason: a
  width limit written as a percentage of a container that the dial had already
  stretched. It is now centred with equal margins at every size.

### Changed

- The numbers around the dial sit closer to their ticks and are smaller, and
  they no longer grow with the dial — 11px on a large phone, never under 7.5px
  on a small one.
- **The lowest and highest frame rate now read "24 fps" and "240 fps"**, so the
  scale says what it measures without repeating the unit seven times.
- Every number on the sliders is centred on its own mark, the two at the ends
  included. They were aligned inward before, which made them disagree with the
  mark they label.

## [0.0.8] - 2026-08-17

### Added

- **A printed scale on both sliders.** Small marks at every whole stop, taller
  marks with a number above them at the ones worth navigating by: 1/8000,
  1/1000, 1/125, 1/15, 0.5s, 4s and 30s on the shutter, and f/1.4, f/2.8,
  f/5.6, f/11 and f/22 on the aperture.
- **An "ND filters" button beside the answer**, at every screen size. It opens a
  page explaining what an ND filter is and what a stop means, then lists every
  strength with how much light it blocks and what it would give you. Strengths
  your aircraft's maker actually sells are marked with a dot; the rest stay in
  the list, because other makers sell those.

### Changed

- **Both sliders now place their values by ratio, not by count.** The shutter
  table carries the video speeds 1/120 and 1/240 next to their stills
  neighbours 1/125 and 1/250, a twentieth of a stop apart — but each took a full
  step of the slider, which bent every mark past 1/250 s away from where it
  belonged. Halfway along the shutter slider is now 1/15 s, which is genuinely
  the halfway point.
- "You metered" is now **"Metered shutter"**.
- "Recommended filter" sits on two lines inside the ring, and shrinks with the
  dial so it stays inside it on a small phone.

## [0.0.7] - 2026-08-17

### Added

- **A handle on the dial, with an arrow pointing at the rate it has landed on.**
  It was always draggable; now it looks it. The handle grows while you drag, and
  a finger gets a target far wider than the drawn dot.
- **Marks on both sliders at the whole stops.** Nineteen on the shutter slider,
  from 1/8000 s down to 30 s; nine on the aperture slider, f/1.4 to f/22. They
  give your thumb something to aim at.

### Changed

- **The frame rates on the dial are now spaced by ratio, not by count.** 240 is
  one octave above 120 and two above 60, while 24 and 25 are a twentieth of an
  octave apart. Spacing all seven evenly drew those gaps identically and hid the
  relationship. They now sit where the arithmetic puts them, with one caveat:
  pure logarithmic spacing would leave 24 and 25 five degrees apart, which is
  seven pixels on a phone with two labels on top of one another, so neighbours
  are held to a minimum gap. The widest gap is still three and a half times the
  narrowest.

## [0.0.6] - 2026-08-16

### Added

- **The ND calculator now tells you what aperture to set.** A filter almost
  never lands exactly on what you need — you need 2.3 stops, ND4 gives 2. Set
  the aperture you are shooting at and the app closes that gap for you: "adjust
  aperture to f/3.2". If the aperture you would need does not exist, it says so
  rather than printing an f-number no lens has.
- 240 fps, alongside 24, 25, 30, 50, 60 and 120.

### Changed

- **The ND calculator is built around a dial.** Turn the outer ring to pick your
  frame rate; the filter to fit glows in the middle of it. Drag it, scroll it,
  or use the arrow keys. Tapping the answer in the centre does not move the
  dial.
- The metered shutter speed is a slider instead of a dropdown, so you can sweep
  the whole range with your thumb.
- **The whole tool fits one phone screen.** Nothing scrolls. On a phone the
  "what each filter would give" table moved behind an *All filters* button; on a
  wide screen it stays where it was. Every filter strength is still one tap
  away.
- The shutter angle and the fixed-time option moved behind the ⓘ beside the
  frame rate. Turning the dial always goes back to a frame rate, so you cannot
  get stuck having set a fixed time and forgotten.

## [0.0.4] - 2026-08-16

Version numbering restarted at `0.0.x` during this cycle; the `1.0.0` entry
below predates that decision.

### Added

- Each tool now has its own URL. The solar planner is at `/solar`, the ND
  calculator at `/nd`, and `/` sends you to the first tool. Both can be
  bookmarked, shared, and reached with the browser's back button.
- An app menu behind a hamburger, replacing the two tabs. It lists the tools,
  plus Settings and a new "About ND filters" explaining what ND means, what the
  numbers mean, why video needs filters and why photography treats them
  differently.
- A gear picker in the ND calculator covering 20 aircraft and 30 camera bodies,
  each backed by a manufacturer or vendor source. Choosing your aircraft narrows
  the filter list to the strengths sold for it, with every other strength one
  tap away. Models that could not be confirmed are listed with the reason
  instead of being guessed at.
- The active tool's name appears under the wordmark, and the version number
  beside it.

### Changed

- **The ND calculator now answers the question you actually ask.** It used to
  compute the shutter speed a filter would give you — a number your aircraft
  already displays. It now takes the exposure your camera meters and the frame
  rate you want, and tells you **which filter to fit**, how far it lands from
  your target, and what every other filter would give.
- The shutter list grew from 19 full stops to 57 entries at 1/3 stops. It
  previously had no `1/50 s` — the standard shutter for 24 and 25 fps — so the
  reading a pilot sees on their aircraft could not be entered.
- Long exposures over an hour read as `8h 32m` rather than `512m 0s`.
- Light, dark and system switching moved to the page footer, where it is one tap
  away. It was previously buried at the foot of the settings drawer.
- Corner radii halved throughout, and secondary explanatory text moved behind
  info buttons so the screens carry the numbers rather than the prose.

### Fixed

- The tie-break when a required strength sits exactly between two filters now
  resolves to the stronger one regardless of how the filter list was ordered.
  Too weak leaves the shutter faster than the target and the motion choppy.
- Opening the menu no longer shifts the wordmark sideways on a wide screen.
- Removed advice text whose "middle-ground exposure" case described high-speed
  tracking shots while only ever being reachable from slow shutter speeds.

## [1.0.0] - 2026-07-18

### Changed

- Added Vite dependency pre-bundling for Lucide Vue, Vue DevTools, GSAP, Leaflet, and SunCalc to prevent development-time page reloads.
