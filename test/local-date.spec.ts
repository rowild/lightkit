import { describe, it, expect, afterEach } from 'vitest'
import { toLocalDateString } from '~/utils/localDate'

const originalTz = process.env.TZ

afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ
  else process.env.TZ = originalTz
})

describe('toLocalDateString', () => {
  // The solar page opened on yesterday's date between 00:00 and 02:00 in
  // Vienna, because it read the date in UTC. The calendar date the reader
  // sees on their own clock is the one the page must open on.
  it('keeps the local date just after midnight east of Greenwich', () => {
    process.env.TZ = 'Europe/Vienna'
    // 00:30 in Vienna is still 22:30 on the previous day in UTC.
    expect(toLocalDateString(new Date('2026-10-11T00:30:00+02:00'))).toBe('2026-10-11')
  })

  it('keeps the local date in the evening west of Greenwich', () => {
    process.env.TZ = 'America/Los_Angeles'
    // 20:00 in Los Angeles is already 03:00 on the next day in UTC.
    expect(toLocalDateString(new Date('2026-10-10T20:00:00-07:00'))).toBe('2026-10-10')
  })

  it('pads month and day to two digits, as <input type="date"> requires', () => {
    process.env.TZ = 'Europe/Vienna'
    expect(toLocalDateString(new Date('2026-01-05T12:00:00+01:00'))).toBe('2026-01-05')
  })
})
