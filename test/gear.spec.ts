import { describe, it, expect } from 'vitest'
import { ndFilters } from '~/utils/nd'
import { ANY_GEAR_ID, gearEntries, unverifiedGear, findGear, gearGroups } from '~/data/gear'

const knownStopValues = ndFilters.map(f => f.stops)

describe('gearEntries', () => {
  it('carries every model from the researched seed', () => {
    // 20 drones plus 30 camera bodies in common-nd-gear-seed.json, plus the six
    // handheld gimbal and action cameras researched on 2026-08-17.
    expect(gearEntries.length).toBe(56)
  })

  it('gives every model a unique kebab-case id', () => {
    const ids = gearEntries.map(g => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('never uses the reserved "any" id', () => {
    expect(gearEntries.some(g => g.id === ANY_GEAR_ID)).toBe(false)
  })

  it('cites at least one https source for every model', () => {
    for (const gear of gearEntries) {
      expect(gear.sources.length).toBeGreaterThan(0)
      for (const source of gear.sources) expect(source).toMatch(/^https:\/\//)
    }
  })

  it('records an ISO check date for every model', () => {
    for (const gear of gearEntries) expect(gear.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('states how each model takes a filter', () => {
    for (const gear of gearEntries) {
      expect(['external', 'internal', 'both']).toContain(gear.ndSupport)
    }
  })

  it('only lists filter strengths the app knows about', () => {
    for (const gear of gearEntries) {
      for (const stop of gear.knownStops) expect(knownStopValues).toContain(stop)
    }
  })

  it('keeps knownStops sorted and free of duplicates', () => {
    for (const gear of gearEntries) {
      expect(gear.knownStops).toEqual([...gear.knownStops].sort((a, b) => a - b))
      expect(new Set(gear.knownStops).size).toBe(gear.knownStops.length)
    }
  })

  it('includes the aircraft the app was built for', () => {
    const names = gearEntries.map(g => `${g.brand} ${g.model}`)
    expect(names).toContain('DJI Mavic 3 Pro')
    expect(names).toContain('DJI Avata 2')
  })
})

describe('unverifiedGear', () => {
  it('gives every entry a brand, a model and a plain reason', () => {
    for (const item of unverifiedGear) {
      expect(item.brand.trim()).not.toBe('')
      expect(item.model.trim()).not.toBe('')
      expect(item.reason.trim()).not.toBe('')
    }
  })

  it('never repeats a model that is already verified', () => {
    const verified = new Set(gearEntries.map(g => `${g.brand} ${g.model}`))
    for (const item of unverifiedGear) {
      expect(verified.has(`${item.brand} ${item.model}`)).toBe(false)
    }
  })
})

describe('findGear', () => {
  it('finds a model by id', () => {
    const first = gearEntries[0]!
    expect(findGear(first.id)).toEqual(first)
  })

  it('returns undefined for the "any" id and for unknown ids', () => {
    expect(findGear(ANY_GEAR_ID)).toBeUndefined()
    expect(findGear('no-such-drone')).toBeUndefined()
  })
})

describe('gearGroups', () => {
  it('groups every model under its brand exactly once', () => {
    const groups = gearGroups()
    expect(groups.flatMap(g => g.models).length).toBe(gearEntries.length)
    expect(new Set(groups.map(g => g.brand)).size).toBe(groups.length)
  })

  it('sorts brands alphabetically', () => {
    const brands = gearGroups().map(g => g.brand)
    expect(brands).toEqual([...brands].sort((a, b) => a.localeCompare(b)))
  })
})
