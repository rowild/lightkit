import type ImageTileSource from 'ol/source/ImageTile'
import type { LoaderOptions } from 'ol/source/DataTile'

/** OpenWeatherMap tile layers rendered by the map. */
export type OpenWeatherTileLayer =
  | 'clouds_new'
  | 'precipitation_new'
  | 'pressure_new'
  | 'temp_new'

/** Inputs required to construct an OpenWeatherMap tile source. */
export type OpenWeatherTileSourceInput = {
  readonly layer: OpenWeatherTileLayer
  readonly apiKey: string
  readonly attribution: string
}

const OPEN_WEATHER_TILE_MAX_ZOOM = 10
const EUROPE_VIEW_ZOOM = 4
const EUROPE_VIEW_ALPHA_EXPONENT = 0.5
const REGIONAL_VIEW_ALPHA_EXPONENT = 0.7

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const rainAlphaExponent = (sourceZoom: number) => {
  const zoom = Number.isFinite(sourceZoom)
    ? clamp(sourceZoom, EUROPE_VIEW_ZOOM, OPEN_WEATHER_TILE_MAX_ZOOM)
    : OPEN_WEATHER_TILE_MAX_ZOOM
  const progress = (zoom - EUROPE_VIEW_ZOOM) /
    (OPEN_WEATHER_TILE_MAX_ZOOM - EUROPE_VIEW_ZOOM)

  return EUROPE_VIEW_ALPHA_EXPONENT +
    progress * (REGIONAL_VIEW_ALPHA_EXPONENT - EUROPE_VIEW_ALPHA_EXPONENT)
}

/**
 * Return the alpha used to render one OpenWeatherMap rain pixel.
 *
 * @param providerAlpha - Alpha encoded in the provider tile, from zero to one.
 * @param sourceZoom - Native zoom level of the downloaded weather tile.
 * @returns The alpha to write back to the processed tile.
 */
export function boostRainAlpha(providerAlpha: number, sourceZoom: number): number {
  const alpha = Number.isFinite(providerAlpha) ? clamp(providerAlpha, 0, 1) : 0
  if (alpha === 0 || alpha === 1) return alpha
  return Math.pow(alpha, rainAlphaExponent(sourceZoom))
}

const openWeatherTileUrl = (
  input: OpenWeatherTileSourceInput,
  z: number | string,
  x: number | string,
  y: number | string
) => `https://tile.openweathermap.org/map/${input.layer}/${z}/${x}/${y}.png?appid=${encodeURIComponent(input.apiKey)}`

const loadImage = (url: string, options: LoaderOptions) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.crossOrigin = options.crossOrigin ?? 'anonymous'
  if (options.referrerPolicy !== undefined) image.referrerPolicy = options.referrerPolicy
  image.addEventListener('load', () => resolve(image), { once: true })
  image.addEventListener('error', () => reject(new Error('OpenWeatherMap rain tile failed to load')), { once: true })
  image.src = url
})

const renderRainTile = (image: HTMLImageElement, sourceZoom: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Rain tile canvas is unavailable')

  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  for (let alphaIndex = 3; alphaIndex < pixels.data.length; alphaIndex += 4) {
    pixels.data[alphaIndex] = Math.round(
      boostRainAlpha(pixels.data[alphaIndex] / 255, sourceZoom) * 255
    )
  }
  context.putImageData(pixels, 0, 0)
  return canvas
}

const createRainTileLoader = (input: OpenWeatherTileSourceInput) => async (
  z: number,
  x: number,
  y: number,
  options: LoaderOptions
) => {
  const image = await loadImage(openWeatherTileUrl(input, z, x, y), options)
  return renderRainTile(image, z)
}

/**
 * Construct an OpenWeatherMap image-tile source without exposing the API key to logs.
 *
 * @param Source - Lazily imported OpenLayers image-tile source constructor.
 * @param input - Provider layer, credential, and attribution.
 * @returns An OpenLayers source for the requested weather layer.
 */
export function createOpenWeatherTileSource(
  Source: typeof ImageTileSource,
  input: OpenWeatherTileSourceInput
): ImageTileSource {
  const commonOptions = {
    attributions: input.attribution,
    maxZoom: OPEN_WEATHER_TILE_MAX_ZOOM,
    crossOrigin: 'anonymous'
  } as const

  if (input.layer === 'precipitation_new') {
    return new Source({
      ...commonOptions,
      loader: createRainTileLoader(input)
    })
  }

  return new Source({
    ...commonOptions,
    url: openWeatherTileUrl(input, '{z}', '{x}', '{y}')
  })
}
