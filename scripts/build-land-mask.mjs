// Rasterises Natural Earth land polygons into an equirectangular SVG, which
// ImageMagick then turns into public/textures/land-mask.png for the sky view's
// dot globe. Usage: node scripts/build-land-mask.mjs <land.geojson> <out.svg>
import { readFileSync, writeFileSync } from 'node:fs'

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('Usage: node scripts/build-land-mask.mjs <land.geojson> <out.svg>')
  process.exit(1)
}

const WIDTH = 1024
const HEIGHT = 512
const project = ([lng, lat]) =>
  `${(((lng + 180) / 360) * WIDTH).toFixed(2)},${(((90 - lat) / 180) * HEIGHT).toFixed(2)}`

const geo = JSON.parse(readFileSync(input, 'utf8'))
const rings = []
for (const feature of geo.features) {
  const { type, coordinates } = feature.geometry
  const polygons = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : []
  for (const polygon of polygons) {
    for (const ring of polygon) rings.push(`M${ring.map(project).join('L')}Z`)
  }
}

writeFileSync(
  output,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#000"/>` +
    `<path fill="#fff" fill-rule="evenodd" d="${rings.join('')}"/></svg>`
)
console.log(`Wrote ${rings.length} rings to ${output}`)
