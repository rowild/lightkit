# Sky view textures

Served from LightKit's own origin, so the service worker caches them the first
time the sky view opens (same-origin requests are stale-while-revalidate in
`public/sw.js`).

| File | Source | Downloaded |
|---|---|---|
| `earth-day.jpg` | NASA Visible Earth, Blue Marble Next Generation, July 2004, topography and bathymetry — https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/world.topo.bathy.200407.3x5400x2700.jpg | 2026-10-10 |
| `earth-night.jpg` | NASA Earth Observatory, Black Marble 2016, 0.1° — https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg | 2026-10-10 |
| `land-mask.png` | Natural Earth 1:110m land — https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson, rasterised by `scripts/build-land-mask.mjs` | 2026-10-10 |

NASA imagery is not protected by copyright; NASA asks to be credited, which
the sky view's ⓘ dialog does. Natural Earth is in the public domain.

## Rebuilding

    TMP=$(mktemp -d)
    curl -fsSL -o "$TMP/day.jpg" https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/world.topo.bathy.200407.3x5400x2700.jpg
    curl -fsSL -o "$TMP/night.jpg" https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg
    curl -fsSL -o "$TMP/land.geojson" https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
    magick "$TMP/day.jpg" -resize '2048x1024!' -strip -interlace JPEG -quality 82 public/textures/earth-day.jpg
    magick "$TMP/night.jpg" -resize '2048x1024!' -strip -interlace JPEG -quality 80 public/textures/earth-night.jpg
    node scripts/build-land-mask.mjs "$TMP/land.geojson" "$TMP/land.svg"
    magick -background black "$TMP/land.svg" -threshold 50% -type bilevel public/textures/land-mask.png
