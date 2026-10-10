/**
 * A date as `YYYY-MM-DD` on the device's own calendar, the format
 * `<input type="date">` takes.
 *
 * Not `toISOString()`, which is UTC: the solar page used it until 2026-10-11
 * and opened on yesterday's date between 00:00 and 02:00 in Vienna, so the sky
 * view treated today as another date and its sun stood still.
 */
export const toLocalDateString = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
