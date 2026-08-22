import { describe, expect, it } from 'vitest'
import ImageTileSource from 'ol/source/ImageTile'
import { createXYZ } from 'ol/tilegrid'
import {
  boostRainAlpha,
  createOpenWeatherTileSource
} from '~/utils/openWeatherMapTiles'

describe('boostRainAlpha', () => {
  it('keeps dry pixels completely transparent', () => {
    expect(boostRainAlpha(0, 4)).toBe(0)
    expect(boostRainAlpha(0, 10)).toBe(0)
  })

  it('makes faint rain more visible at Europe zoom than regional zoom', () => {
    expect(boostRainAlpha(0.01, 4)).toBeCloseTo(0.1, 10)
    expect(boostRainAlpha(0.01, 10)).toBeCloseTo(0.0398107171, 10)
  })

  it('preserves precipitation intensity ordering', () => {
    const lightRain = boostRainAlpha(0.04, 6)
    const heavyRain = boostRainAlpha(0.36, 6)

    expect(lightRain).toBeGreaterThan(0.04)
    expect(heavyRain).toBeGreaterThan(lightRain)
    expect(heavyRain).toBeLessThanOrEqual(1)
  })
})

describe('createOpenWeatherTileSource', () => {
  it('overzooms the last useful weather tile above source zoom 10', () => {
    const source = createOpenWeatherTileSource(ImageTileSource, {
      layer: 'pressure_new',
      apiKey: 'temporary-test-key',
      attribution: 'Weather test attribution'
    })
    const viewGrid = createXYZ({ maxZoom: 19 })
    const sourceGrid = source.getTileGrid()

    expect(sourceGrid.getZForResolution(viewGrid.getResolution(12))).toBe(10)
    expect(sourceGrid.getZForResolution(viewGrid.getResolution(19))).toBe(10)
  })
})
