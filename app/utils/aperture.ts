/**
 * Aperture arithmetic for the ND filter tool.
 *
 * Deliberately free of Vue, Nuxt and browser APIs so it can be unit tested in a
 * plain node environment, exactly like `nd.ts` beside it.
 *
 * Product rule 1 still holds. Nothing here reads the selected gear. The
 * f-number is a reading the user sets, in the same way the metered shutter
 * speed is a reading the user sets.
 */

/**
 * The 1/3-stop f-number series, widest first.
 *
 * These are the marketed labels, not exact powers of the square root of two.
 * `shutterSpeeds` makes the same choice for the same reason: a calculation
 * built on the label matches the number the user reads off the aircraft.
 */
export const apertures: number[] = [
  1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5,
  5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22
]

/**
 * How an f-number is printed.
 *
 * Cameras carry one decimal on the wide half of the scale and drop it from f/10
 * up, which is where the third-stops become whole numbers anyway.
 */
export const apertureLabel = (fNumber: number): string =>
  `f/${fNumber < 10 ? fNumber.toFixed(1) : String(Math.round(fNumber))}`

/**
 * Stops of light between two f-numbers. Positive means `to` is the darker one.
 *
 * The factor of two is not a fudge: an f-number is a ratio of lengths, and the
 * light through the hole goes as its area, so one stop is a factor of the
 * square root of two in the f-number.
 */
export const stopsBetween = (from: number, to: number): number =>
  2 * Math.log2(to / from)

/**
 * The f-number reached by changing exposure by `stops`.
 * Positive stops close the iris, so the f-number rises.
 */
export const apertureAfterStops = (from: number, stops: number): number =>
  from * Math.pow(2, stops / 2)

/**
 * The nearest entry in the series.
 *
 * Distance is measured in stops, not in raw f-numbers. The series is
 * geometric, so a linear comparison would drag every answer towards the wide
 * end where the numbers sit closer together.
 *
 * The series is a non-empty constant, so this always returns a value.
 */
export const nearestAperture = (fNumber: number): { fNumber: number; index: number } => {
  let index = 0
  for (let i = 1; i < apertures.length; i++) {
    const candidate = Math.abs(stopsBetween(apertures[i]!, fNumber))
    const chosen = Math.abs(stopsBetween(apertures[index]!, fNumber))
    if (candidate < chosen) index = i
  }
  return { fNumber: apertures[index]!, index }
}

export interface ApertureTrim {
  /** The f-number to set, snapped to the series. */
  fNumber: number
  /** Its index in `apertures`. */
  index: number
  /** Stops the user is asked to move. Positive closes the iris. */
  stops: number
  /**
   * What is still uncovered once the aperture has moved, in stops. Feeds the
   * same `describeOffset` the panel already uses, so product rule 4 is kept:
   * the leftover is reported, never hidden.
   */
  leftoverStops: number
  /** True when the ideal value fell outside f/1.4 to f/22 and was clamped. */
  clamped: boolean
}

/**
 * The aperture to set so the chosen filter's leftover error disappears.
 *
 * `residualStops` comes straight from `nearestFilter` in `nd.ts`. Positive
 * means the filter blocks more than needed and the frame is too dark, so the
 * iris opens and the f-number falls. Negative means the filter is too weak, so
 * the iris closes and the f-number rises. Hence the sign flip below.
 */
export const apertureTrim = (currentF: number, residualStops: number): ApertureTrim => {
  const ideal = apertureAfterStops(currentF, -residualStops)
  const snapped = nearestAperture(ideal)
  const stops = stopsBetween(currentF, snapped.fNumber)

  return {
    fNumber: snapped.fNumber,
    index: snapped.index,
    stops,
    leftoverStops: residualStops + stops,
    clamped: ideal < apertures[0]! || ideal > apertures[apertures.length - 1]!
  }
}

/**
 * Indices of `apertures` that sit a whole stop apart, for the marks under the
 * slider.
 *
 * Every third entry, because the series is a clean 1/3-stop run with no
 * interlopers - unlike the shutter table, which carries the video speeds 1/120
 * and 1/240 alongside their stills neighbours. The test asserts the result is
 * f/1.4 through f/22, so this stays honest if the series is ever edited.
 */
export const wholeStopApertureIndices: number[] = apertures
  .map((_, index) => index)
  .filter(index => index % 3 === 0)

/**
 * The marks that also carry a printed number: every second whole stop, which
 * lands on f/1.4, f/2.8, f/5.6, f/11 and f/22.
 *
 * Five, not the nine whole stops, because an f-number is five characters wide
 * at 9px and nine of them collide on a phone.
 */
export const labelledApertureIndices: number[] = apertures
  .map((_, index) => index)
  .filter(index => index % 6 === 0)
