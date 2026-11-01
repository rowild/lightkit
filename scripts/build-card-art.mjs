/**
 * Paints the start page's card images into public/cards/.
 *
 * Every image is computed pixel by pixel here, except that the Solar Planner's
 * planet samples the NASA textures the sky view already ships. No image library:
 * raw RGB goes straight to ImageMagick, which writes the WebP.
 *
 *     node scripts/build-card-art.mjs          (all of them)
 *     node scripts/build-card-art.mjs moon     (one of them)
 *
 * The output is committed, so this only runs when a picture should change.
 * Fixed seeds: the same script paints the same pictures.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public/cards')

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const mix = (a, b, t) => a + (b - a) * t
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const hex = (s) => [1, 3, 5].map(i => (parseInt(s.slice(i, i + 2), 16) / 255) ** 2.2)

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const noise = (x, y) => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return mix(
    mix(hash(ix, iy), hash(ix + 1, iy), ux),
    mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux),
    uy
  )
}
const fbm = (x, y, octaves = 5) => {
  let sum = 0
  let amp = 0.5
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x, y)
    x = x * 2.03 + 17.1
    y = y * 2.03 + 9.2
    amp *= 0.5
  }
  return sum
}

/** Scatters points once, then answers "how much star is at this pixel". */
const starField = (w, h, count, seed) => {
  const random = rng(seed)
  const buffer = new Float32Array(w * h)
  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * w)
    const y = Math.floor(random() * h)
    const size = random() ** 6 * 2.2 + 0.5
    const bright = random() ** 3 * 0.9 + 0.1
    const reach = Math.ceil(size * 2)
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const px = x + dx
        const py = y + dy
        if (px < 0 || py < 0 || px >= w || py >= h) continue
        const fall = Math.exp(-(dx * dx + dy * dy) / (size * size))
        buffer[py * w + px] = Math.max(buffer[py * w + px], fall * bright)
      }
    }
  }
  return (x, y) => buffer[y * w + x]
}

const readTexture = (file, width, height) => {
  const raw = execFileSync('magick', [join(root, file), '-depth', '8', 'rgb:-'], { maxBuffer: 1 << 28 })
  return (lon, lat) => {
    const x = ((lon / (2 * Math.PI) + 0.5) % 1 + 1) % 1
    const y = clamp(0.5 - lat / Math.PI, 0, 0.9999)
    const fx = x * width
    const fy = y * (height - 1)
    const x0 = Math.floor(fx) % width
    const x1 = (x0 + 1) % width
    const y0 = Math.floor(fy)
    const y1 = Math.min(y0 + 1, height - 1)
    const tx = fx - Math.floor(fx)
    const ty = fy - y0
    const at = (px, py, c) => (raw[(py * width + px) * 3 + c] / 255) ** 2.2
    return [0, 1, 2].map(c =>
      mix(mix(at(x0, y0, c), at(x1, y0, c), tx), mix(at(x0, y1, c), at(x1, y1, c), tx), ty)
    )
  }
}

const GOLD = hex('#ffb347')
const EMBER = hex('#ff6a2b')
const CYAN = hex('#6fc3ff')
const DEEP = hex('#050a12')
const PETROL = hex('#0d1e26')

/** The planet from low orbit at the end of the day: city lights on the night
    side, the sunset line near the limb, gold then cyan in the air above it. */
const paintSolar = (w, h) => {
  const day = readTexture('public/textures/earth-day.jpg', 2048, 1024)
  const night = readTexture('public/textures/earth-night.jpg', 2048, 1024)
  const stars = starField(w, h, 900, 11)
  const R = w * 0.82
  const cx = w * 0.5
  const cy = h * 0.55 + R
  const tilt = 0.1 // Puts central Europe in the visible band, just under the limb.
  const lon0 = 0.26 // Central Europe faces the viewer.
  const sun = (() => {
    const v = [0.86, 0.3, -0.42]
    const n = Math.hypot(...v)
    return v.map(c => c / n)
  })()
  return (x, y) => {
    const dx = (x - cx) / R
    const dy = (y - cy) / R
    const d2 = dx * dx + dy * dy
    const d = Math.sqrt(d2)
    const limb = Math.max(0, d - 1)
    const sunSide = clamp(0.5 + 0.5 * (dx * 3.2))
    const air = mix3(CYAN, GOLD, smooth(0.25, 0.85, sunSide))
    let colour = mix3(DEEP, PETROL, smooth(0, 1, y / h) * 0.8)
    colour = add3(colour, [1, 1, 1], stars(x, y) * 0.7 * smooth(0.012, 0.09, limb))
    if (d >= 1) {
      colour = add3(colour, air, Math.exp(-limb * 62) * 0.9)
      colour = add3(colour, CYAN, Math.exp(-limb * 15) * 0.1)
      return colour
    }
    const nz = Math.sqrt(1 - d2)
    const ny = -dy
    const px = dx
    const py = ny * Math.cos(tilt) + nz * Math.sin(tilt)
    const pz = -ny * Math.sin(tilt) + nz * Math.cos(tilt)
    const lat = Math.asin(clamp(py, -1, 1))
    const lon = Math.atan2(px, pz) + lon0
    const light = dx * sun[0] + ny * sun[1] + nz * sun[2]
    const dayShare = smooth(-0.02, 0.34, light)
    const land = day(lon, lat)
    const lights = night(lon, lat)
    const nightColour = add3([0.002, 0.005, 0.012], [1, 0.72, 0.42], lights[0] * 3.4)
    const dayColour = mix3(land, GOLD, 0.08)
    colour = mix3(nightColour, dayColour.map(c => c * 0.5), dayShare)
    const dusk = Math.exp(-(light * light) / 0.008)
    colour = add3(colour, EMBER, dusk * 0.07)
    const edge = 1 - nz
    colour = add3(colour, air, edge ** 6 * 1.1)
    return colour
  }
}

/** Dark glass, stacked. Each disc is a filter, each one cuts the light again. */
const paintNd = (w, h) => {
  const stars = starField(w, h, 260, 23)
  const discs = [
    { x: 0.32, y: 0.5, r: 0.36, density: 0.62, tint: hex('#27424f') },
    { x: 0.5, y: 0.44, r: 0.42, density: 0.58, tint: hex('#1d3540') },
    { x: 0.7, y: 0.52, r: 0.34, density: 0.52, tint: hex('#132733') }
  ]
  return (x, y) => {
    const u = x / w
    const v = y / w
    let colour = mix3(hex('#0b1a22'), DEEP, smooth(0, 1, y / h))
    colour = add3(colour, CYAN, Math.exp(-((u - 0.5) ** 2 + (v - 0.34) ** 2) * 7) * 0.09)
    colour = add3(colour, [1, 1, 1], stars(x, y) * 0.35)
    for (const disc of discs) {
      const dx = u - disc.x
      const dy = v - disc.y
      const d = Math.hypot(dx, dy) / disc.r
      if (d > 1.012) continue
      const inside = smooth(1.012, 0.996, d)
      const swirl = fbm(u * 3 + disc.x * 9, v * 3, 3) * 0.05
      const glass = mix3(colour.map(c => c * (1 - disc.density)), disc.tint, 0.28 + swirl)
      colour = mix3(colour, glass, inside)
      const angle = Math.atan2(dy, dx)
      const sheen = Math.max(0, Math.cos(angle + 2.1)) ** 3
      colour = add3(colour, mix3(CYAN, [1, 1, 1], 0.2), smooth(0.93, 0.998, d) * inside * sheen * 0.34)
      colour = add3(colour, GOLD, smooth(0.965, 0.998, d) * inside * Math.max(0, Math.cos(angle - 1)) ** 4 * 0.2)
      const ring = Math.exp(-((d - 0.72) ** 2) / 0.0009) * 0.004
      colour = add3(colour, [1, 1, 1], ring * inside)
    }
    return colour
  }
}

/** A low sun, rippled sand, and one long shadow from a standing stone. */
const paintShadow = (w, h) => (x, y) => {
  const u = x / w
  const v = y / h
  const horizon = 0.36 + fbm(u * 3, 2.2, 3) * 0.05
  if (v < horizon && !(Math.abs(u - 0.62) < 0.016 && v > 0.24)) {
    let sky = mix3(hex('#3f2a3a'), EMBER, smooth(0, horizon, v) ** 2)
    sky = add3(sky, GOLD, Math.exp(-((u - 0.78) ** 2 * 12 + (v - horizon) ** 2 * 70)) * 1.1)
    return sky
  }
  const depth = (v - horizon) / (1 - horizon)
  const scale = 1 / (depth + 0.08)
  const ripple = Math.sin((u * 7 + fbm(u * 3, v * 4, 3) * 2.2) * scale * 1.2 + depth * 90) * 0.5 + 0.5
  let sand = mix3(hex('#6a3d1f'), hex('#d8914a'), 0.25 + ripple * 0.4 + (1 - depth) * 0.3)
  // The sun stands far right on the horizon, so the shadow runs the other way:
  // down and to the left, widening as it comes towards the viewer.
  const baseU = 0.62
  const baseV = 0.56
  const along = v - baseV
  if (along > -0.005) {
    const shadowU = baseU - along * 1.5
    const width = 0.012 + along * 0.1
    const inShadow = smooth(width, width * 0.6, Math.abs(u - shadowU))
    sand = sand.map(c => c * (1 - inShadow * 0.82))
  }
  const stoneTop = 0.24
  const stoneWidth = mix(0.012, 0.03, clamp((v - stoneTop) / (baseV - stoneTop)))
  const stone = Math.abs(u - baseU) < stoneWidth && v > stoneTop && v < baseV
  return stone ? hex('#120b10') : sand
}

/** The moon, lit from one side, on black. */
const paintMoon = (w, h) => {
  const stars = starField(w, h, 500, 41)
  const R = w * 0.32
  const cx = w * 0.56
  const cy = h * 0.4
  const lit = [0.72, 0.28, 0.64]
  const n = Math.hypot(...lit)
  return (x, y) => {
    const dx = (x - cx) / R
    const dy = (y - cy) / R
    const d = Math.hypot(dx, dy)
    let colour = add3(DEEP, [1, 1, 1], stars(x, y) * 0.6)
    colour = add3(colour, hex('#7f93ad'), Math.exp(-Math.max(0, d - 1) * 3.5) * 0.14)
    if (d >= 1) return colour
    const nz = Math.sqrt(1 - d * d)
    const light = clamp((dx * lit[0] + -dy * lit[1] + nz * lit[2]) / n)
    const su = dx * 2 / (1 + nz)
    const sv = dy * 2 / (1 + nz)
    const maria = smooth(0.42, 0.62, fbm(su * 1.6 + 4, sv * 1.6, 5))
    const craters = fbm(su * 11, sv * 11, 4)
    const albedo = mix(0.82, 0.32, maria) * (0.72 + craters * 0.56)
    const body = hex('#d8d4c8').map(c => c * albedo * light ** 0.9)
    return add3(colour.map(c => c * 0.1), body, smooth(1, 0.992, d))
  }
}

/** Star trails turning round the pole, over a dark ridge. */
const paintTimelapse = (w, h) => {
  const random = rng(53)
  const pole = [w * 0.62, h * 0.3]
  const trails = Array.from({ length: 460 }, () => ({
    r: random() ** 0.7 * w * 1.1 + 6,
    start: random() * Math.PI * 2,
    span: 0.42 + random() * 0.12,
    bright: random() ** 2.4 * 0.95 + 0.05,
    hue: random()
  }))
  const buffer = new Float32Array(w * h * 3)
  for (const t of trails) {
    const colour = mix3(hex('#a9cdf5'), hex('#ffd9a6'), t.hue)
    const steps = Math.ceil(t.r * t.span * 1.5)
    for (let i = 0; i < steps; i++) {
      const a = t.start + (t.span * i) / steps
      const x = Math.round(pole[0] + Math.cos(a) * t.r)
      const y = Math.round(pole[1] + Math.sin(a) * t.r)
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      const k = (y * w + x) * 3
      for (let c = 0; c < 3; c++) buffer[k + c] = Math.max(buffer[k + c], colour[c] * t.bright)
    }
  }
  return (x, y) => {
    const k = (y * w + x) * 3
    const sky = mix3(hex('#071425'), hex('#1b3550'), smooth(0.2, 1, y / h))
    const ridge = 0.8 - fbm(x / w * 3.4, 1.3, 4) * 0.2
    if (y / h > ridge) return hex('#04070b')
    return add3(sky, [buffer[k], buffer[k + 1], buffer[k + 2]], 0.9)
  }
}

/** Water turned to mist by a long shutter. */
const paintLongExposure = (w, h) => (x, y) => {
  const u = x / w
  const v = y / h
  const horizon = 0.42
  if (v < horizon) {
    const cloud = fbm(u * 1.2 + 3, v * 15, 5)
    return add3(mix3(hex('#1a2a44'), hex('#c96f5b'), smooth(0, horizon, v) ** 2), hex('#ffcfa6'), smooth(0.45, 0.75, cloud) * smooth(0, horizon, v) * 0.5)
  }
  const depth = (v - horizon) / (1 - horizon)
  const silk = fbm(u * 2.2 + 11, v * 2 + depth * 2, 5)
  const glow = Math.exp(-((u - 0.5) ** 2) * 9) * (1 - depth) ** 1.3
  let water = mix3(hex('#10202f'), hex('#7c8fa8'), silk * 0.9)
  water = add3(water, hex('#ffb98a'), glow * 0.8)
  const rock = 0.97 + fbm(u * 6, 4, 3) * 0.06 - Math.max(0, 0.3 - u) * 0.8
  return v > rock ? hex('#070a0e') : water
}

/** Near lights fall apart into discs. The far ridge stays sharp. */
const paintHyperfocal = (w, h) => {
  const random = rng(71)
  const discs = Array.from({ length: 34 }, () => ({
    x: random() * w,
    y: h * (0.42 + random() * 0.62),
    r: (0.05 + random() ** 2 * 0.14) * w,
    colour: mix3(GOLD, CYAN, random()),
    alpha: 0.05 + random() * 0.1
  }))
  return (x, y) => {
    const ridge = 0.36 + fbm(x / w * 7, 5.1, 5) * 0.14
    let colour = mix3(hex('#10243a'), hex('#355068'), smooth(0, ridge, y / h))
    if (y / h > ridge) colour = mix3(hex('#091119'), hex('#04070b'), smooth(ridge, 1, y / h))
    for (const disc of discs) {
      const d = Math.hypot(x - disc.x, y - disc.y) / disc.r
      if (d > 1) continue
      colour = add3(colour, disc.colour, disc.alpha * (0.72 + smooth(0.82, 0.98, d) * 0.5) * smooth(1, 0.975, d))
    }
    return colour
  }
}

const plates = {
  solar: { paint: paintSolar, width: 1200, height: 1000, quality: 74 },
  nd: { paint: paintNd, width: 1200, height: 1000, quality: 74 },
  shadow: { paint: paintShadow, width: 480, height: 640, quality: 68 },
  moon: { paint: paintMoon, width: 480, height: 640, quality: 68 },
  timelapse: { paint: paintTimelapse, width: 480, height: 640, quality: 68 },
  'long-exposure': { paint: paintLongExposure, width: 480, height: 640, quality: 68 },
  hyperfocal: { paint: paintHyperfocal, width: 480, height: 640, quality: 68 }
}

mkdirSync(outDir, { recursive: true })

for (const name of process.argv[2] ? [process.argv[2]] : Object.keys(plates)) {
  const { paint, width, height, quality } = plates[name]
  const shade = paint(width, height)
  const grain = rng(name.length * 97)
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colour = shade(x, y)
      // A touch of noise before 8 bits, so dark gradients do not band.
      const dither = (grain() - 0.5) / 255
      for (let c = 0; c < 3; c++) {
        pixels[(y * width + x) * 3 + c] = Math.round(clamp(clamp(colour[c]) ** (1 / 2.2) + dither) * 255)
      }
    }
  }
  const target = join(outDir, `${name}.webp`)
  execFileSync('magick', [
    '-size', `${width}x${height}`, '-depth', '8', 'rgb:-',
    '-strip', '-quality', String(quality), target
  ], { input: pixels })
  console.log(`${name}: ${target}`)
}
