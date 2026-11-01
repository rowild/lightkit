# Start page and sky view autostart

Asked for on 2026-11-01. Robert was away, so decisions were made and recorded
here instead of being asked.

## What was asked

1. `/` must be a real start page in the style of the solar tool: project title
   and linked card tiles with title, description and background image. Tools
   that do not exist yet are greyed out and ignore the mouse. Active tiles get a
   mystic animation (night, light, blue hour, golden hour).
2. The "earth" view of the solar tool opens by itself, with a title and a short
   description of what it is good for. An accordion hides the description.
   Consolidate with accordions and content that already exist.
3. Finish with fin-patch and push.

## Decisions

- **"Earth view" is the sky view** (`app/components/sky/SkyView.vue`), the 3D
  planet behind the orbit button. The visible name stays "Sky view", so the
  title, the button and the docs use one word.
- **It opens on every entry to `/solar`.** Closing it lasts until the page is
  entered again. The orbit button still reopens it.
- **When an automatic opening fails** (no WebGL, first visit offline) the overlay
  closes itself: nobody asked for it, so its failure must not block the page.
- **One accordion component**, `AccordionItem.vue`, for the sky view and the four
  Settings sections. The sky view's ⓘ dialog moves into its accordion.
- **Grey tiles are the five tools in `BACKLOG.md`**: shadow, moon and darkness,
  time-lapse, long exposure, hyperfocal.
- **`tools.ts` stays the one list.** Planned tools sit next to the tools there.
- **`/` was also broken for returning visitors.** The service worker precached a
  redirect, and browsers refuse a redirected response for a navigation. A real
  page at `/` removes the redirect; the cache name is bumped to drop the old entry.

## Changed after review, same day

Robert looked at the result. The title and accordion on the stage are gone: "Sky
view" names the button on the solar page, not the stage. Close moved to the far
corner, an info button sits beside it, and the explanation opens in a small
see-through window with its own close button, like a screen on a windshield.
`AccordionItem.vue` stays, for Settings.

## Steps

- [x] Card art: `scripts/build-card-art.mjs` writes `public/cards/*.webp`
- [x] `tools.ts`: art, planned tools, `toolForPath` returns null on `/`
- [x] `pages/index.vue`, `components/home/*`
- [x] Shell: the page scrolls on `/`, the wordmark links home
- [x] `AccordionItem.vue`, used by `ApiKeyModal`
- [x] Sky view: corner close, info button, see-through text window, labels keep clear of it
- [x] Sky view opens by itself, follows a location that arrives late
- [x] Service worker cache bump
- [x] Check phone and desktop, light and dark, in a browser
- [x] fin-patch, push, check the live site
