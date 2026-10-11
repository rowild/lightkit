# LightKit

LightKit is a browser-based light and exposure planner for drone pilots, photographers and filmmakers. It brings solar timing, location planning, weather conditions, and neutral-density filter calculations into one responsive interface.

The toolkit helps identify golden- and blue-hour windows for a selected place and date. Weather data adds wind, gust, cloud, precipitation, humidity, pressure movement, and basic flyability guidance so pilots can make a more informed go/no-go assessment. It is a planning aid only; always verify local airspace rules, weather, and aircraft limitations before flying.

## Features

- Interactive location search and map with world, terrain, night, and day layers
- Golden hour, blue hour, twilight, sunrise, and sunset calculations
- A 3D sky view of the day: the sun's path as a bow over a small planet, with fans of light to the golden and blue hours — on the true sky or as a clock, on NASA Earth or a dot globe — and any other place one tap or search away
- The day schedule, the map and the light windows on one phone screen, without scrolling
- Wind arrows across the visible map, with an optional animated flow, from Open-Meteo — no API key needed
- Weather overlays for cloud, rain, pressure and temperature, each with its own strength setting
- Current conditions and five-day forecast data from OpenWeatherMap
- Wind, gust, cloud cover, precipitation, humidity, six-hour pressure trend,
  visibility, fog risk, air quality, source time and flyability indicators
- ND-filter calculator: enter the exposure your camera meters and the frame rate you want, and it tells you which filter to fit
- Gear list of 20 aircraft and 30 camera bodies, each with a cited source, narrowing the filter choice to what is sold for your model
- Each tool has its own URL, so it can be bookmarked and shared
- Light, dark, and system theme modes
- Remembers your basemap, location, filter choices, and sky-view settings between visits
- Installable PWA with on-demand caching of map tiles for offline use

## Built with

- Nuxt 4 and Vue 3
- TypeScript
- Tailwind CSS
- OpenLayers with OpenStreetMap, CARTO and Esri basemaps
- Three.js, loaded only when the sky view opens
- NASA Blue Marble and Black Marble imagery, Natural Earth land outlines
- SunCalc
- OpenWeatherMap
- Open-Meteo
- GSAP

## Requirements

Use **Node.js 24.11.0 or later in the Node 24 LTS release line**. npm is included with Node.js and is the package manager used by this project.

The version is pinned in `.nvmrc`, so `nvm use` selects it in this directory. Stay on the Node 24 line: on Node 26 the dev server prints a `DEP0205 DeprecationWarning: module.register() is deprecated` on every start. It is a warning, not an error — the server runs — but it comes from `@tailwindcss/node` and cannot be fixed from this codebase.

Live weather is optional and requires a free [OpenWeatherMap API key](https://openweathermap.org/appid). The wind field is the exception: it comes from [Open-Meteo](https://open-meteo.com/), which needs no key at all, and is available whether or not one is configured. Open-Meteo is free for non-commercial use and asks for attribution, which the map's ⓘ button carries. Location search and map tiles require an internet connection unless the relevant tiles have already been cached. The sky view downloads its 3D engine and Earth images the first time it opens; after that the service worker keeps them for offline use. Fonts are bundled with the app.

## Getting started

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) in a browser.

To enable live weather, open the settings drawer in the app and enter an OpenWeatherMap API key. The key is stored in the browser's local storage and sent directly to OpenWeatherMap when weather data is requested.

## npm scripts

```bash
# Start the development server on port 4000
npm run dev

# Create a production build
npm run build

# Preview the production build locally
npm run preview

# Generate a static deployment
npm run generate

# Run the unit tests once
npm test

# Run the unit tests in watch mode
npm run test:watch
```

Generated Nuxt and Nitro output, dependencies, local environment files, and logs are excluded from version control.
