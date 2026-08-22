/**
 * Exposure arithmetic for the ND filter tool.
 *
 * Deliberately free of Vue, Nuxt and browser APIs so it can be unit tested in
 * a plain node environment.
 */

export interface ShutterSpeed {
  /** Exposure time in seconds. */
  value: number
  label: string
}

/**
 * The 1/3-stop shutter series, fastest first.
 *
 * Cameras meter in 1/3 stops, and the reverse calculation needs the user to
 * enter the number their aircraft actually displayed. A full-stop table cannot
 * express 1/50 s - the standard shutter for 24 and 25 fps - nor 1/100, 1/120 or
 * 1/200.
 *
 * Values are the labelled reciprocals, not exact powers of two. A camera marked
 * "1/8000" is nearer 1/8192 in truth, but the label is what the user reads, and
 * a calculation built on the label matches what they typed.
 */
export const shutterSpeeds: ShutterSpeed[] = [
  1 / 8000, 1 / 6400, 1 / 5000, 1 / 4000, 1 / 3200, 1 / 2500,
  1 / 2000, 1 / 1600, 1 / 1250, 1 / 1000, 1 / 800, 1 / 640,
  1 / 500, 1 / 400, 1 / 320, 1 / 250, 1 / 240, 1 / 200, 1 / 160,
  1 / 125, 1 / 120, 1 / 100, 1 / 80, 1 / 60, 1 / 50, 1 / 40,
  1 / 30, 1 / 25, 1 / 20, 1 / 15, 1 / 13, 1 / 10,
  1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3,
  0.4, 0.5, 0.6, 0.8,
  1, 1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30
].map(value => ({
  value,
  // Cameras switch from fractions to decimals below about 1/3 s: a half second
  // is printed 0"5, not 1/2. Deriving the label the other way collides -
  // Math.round(1 / 0.5) and Math.round(1 / 0.6) both give "1/2 s".
  label: value < 0.4 ? `1/${Math.round(1 / value)} s` : `${value.toFixed(1)} s`
}))

/** Index of the default metered reading, 1/250 s. */
export const DEFAULT_SPEED_INDEX = shutterSpeeds.findIndex(s => s.label === '1/250 s')

export interface NdFilter {
  name: string
  /** Stops of light the filter blocks. The factor is 2 ** stops. */
  stops: number
}

/** The ND strengths the tool offers. Names follow how filters are sold: ten
    stops is a factor of 1024, but every maker markets it as ND1000. */
export const ndFilters: NdFilter[] = [
  { name: 'ND2', stops: 1 },
  { name: 'ND4', stops: 2 },
  { name: 'ND8', stops: 3 },
  { name: 'ND16', stops: 4 },
  { name: 'ND32', stops: 5 },
  { name: 'ND64', stops: 6 },
  { name: 'ND128', stops: 7 },
  { name: 'ND256', stops: 8 },
  { name: 'ND512', stops: 9 },
  { name: 'ND1000', stops: 10 }
]

export interface CalculatedExposure {
  /** Exposure time in seconds. */
  seconds: number
  /** Label for the hero readout, e.g. "1/250 s". */
  label: string
  /** Compact label for the inline formula, e.g. "1/250s". */
  mathLabel: string
}

/**
 * Turn an exposure time into the two labels the panel shows.
 *
 * Times of an hour or more appear as hours and minutes. The slowest result the
 * app can produce is 30 s through ten stops, which is 8h 32m; rendering that as
 * "512m 0s" is technically right and useless.
 */
export const formatExposure = (seconds: number): { label: string; mathLabel: string } => {
  if (seconds < 1) {
    const reciprocal = Math.round(1 / seconds)
    return { label: `1/${reciprocal} s`, mathLabel: `1/${reciprocal}s` }
  }

  if (seconds < 60) {
    return { label: `${seconds.toFixed(1)} s`, mathLabel: `${seconds.toFixed(1)}s` }
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const rest = Math.round(seconds % 60)
    const text = `${minutes}m ${rest}s`
    return { label: text, mathLabel: text }
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  const text = `${hours}h ${minutes}m`
  return { label: text, mathLabel: text }
}

/** Apply an ND filter of `stops` strength to a base exposure time. */
export const calculateExposure = (baseSeconds: number, stops: number): CalculatedExposure => {
  const seconds = baseSeconds * Math.pow(2, stops)
  return { seconds, ...formatExposure(seconds) }
}

/** Look up a shutter index by value, falling back to 1/250 s. */
export const getSpeedIndex = (value: number): number => {
  const index = shutterSpeeds.findIndex(s => Math.abs(s.value - value) < 0.0001)
  return index === -1 ? DEFAULT_SPEED_INDEX : index
}

/** The 180-degree shutter rule: the shutter is open for half of each frame. */
export const SHUTTER_ANGLE_DEFAULT = 180

/** Frame rates offered as choices, and the seven ticks on the dial. */
export const frameRates = [24, 25, 30, 50, 60, 120, 240]

/**
 * Target shutter time for a frame rate and shutter angle.
 *
 * A shutter angle is the fraction of each frame the shutter stays open,
 * expressed in degrees of a rotating disc. 180 degrees is half the frame, which
 * is the film convention and looks natural. Smaller angles look sharper and
 * more staccato; larger ones blur more.
 */
export const shutterFromFrameRate = (
  fps: number,
  angleDegrees: number = SHUTTER_ANGLE_DEFAULT
): number => angleDegrees / (360 * fps)

/**
 * Stops of light that must be blocked to move from the metered reading to the
 * target shutter time.
 *
 * Negative means the target is faster than what the camera already meters, so
 * the user needs more light and no filter can help.
 */
export const requiredStops = (meteredSeconds: number, targetSeconds: number): number =>
  Math.log2(targetSeconds / meteredSeconds)

export interface FilterMatch {
  filter: NdFilter
  /**
   * How far the chosen filter lands from the requirement, in stops.
   * Negative: weaker than needed, so the shutter stays faster than the target.
   * Positive: stronger than needed, so the shutter goes slower than the target.
   */
  residualStops: number
}

/**
 * The filter closest to a fractional requirement.
 *
 * Takes the filters to consider as an argument and never widens beyond them, so
 * the caller decides the range. Product rule 4 forbids passing an aircraft's
 * commercial kit here: recommend from the full ND range and report the leftover
 * honestly instead.
 *
 * An exact tie resolves upwards, towards the stronger filter. Too weak leaves
 * the shutter faster than the target and the motion choppy; too strong only
 * adds blur, which is the safer error.
 */
export const nearestFilter = (required: number, filters: NdFilter[]): FilterMatch | null => {
  if (filters.length === 0) return null

  const best = filters.reduce((chosen, candidate) => {
    const candidateDistance = Math.abs(candidate.stops - required)
    const chosenDistance = Math.abs(chosen.stops - required)

    if (candidateDistance !== chosenDistance) {
      return candidateDistance < chosenDistance ? candidate : chosen
    }

    // An exact tie takes the stronger filter whatever order the caller
    // supplied. Too weak leaves the shutter faster than the target and the
    // motion choppy; too strong only adds blur, which is the safer error.
    return candidate.stops > chosen.stops ? candidate : chosen
  })

  return { filter: best, residualStops: best.stops - required }
}

export interface FilterOutcome {
  filter: NdFilter
  /** Resulting exposure time in seconds. */
  seconds: number
  label: string
  /** Stops between the result and the target. Negative means still too fast. */
  offsetStops: number
}

/**
 * What every supplied filter would give from this metered reading.
 *
 * This is the old "forward" calculation, run for the whole range at once. It
 * replaces a separate forward mode: the user sees their recommendation and every
 * alternative together, with no extra input and no mode to be stuck in.
 */
export const filterOutcomes = (
  meteredSeconds: number,
  targetSeconds: number,
  filters: NdFilter[]
): FilterOutcome[] =>
  filters.map(filter => {
    const seconds = meteredSeconds * Math.pow(2, filter.stops)
    return {
      filter,
      seconds,
      label: formatExposure(seconds).label,
      offsetStops: Math.log2(seconds / targetSeconds)
    }
  })

/**
 * Split an offset into a number and its words, so a template can set the digits
 * in the mono stack.
 *
 * Josefin has no tabular figures, so a changing figure left in proportional
 * type slides sideways as it ticks - and these rows are right-aligned, which
 * makes the whole string move.
 *
 * Anything under a tenth of a stop reads as "spot on". No filter is cut that
 * finely and no aperture ring can be set that finely, so reporting it would be
 * false precision.
 */
export const describeOffset = (stops: number): { amount: string | null; words: string } => {
  const rounded = Math.round(Math.abs(stops) * 10) / 10
  if (rounded < 0.1) return { amount: null, words: 'spot on' }

  const unit = rounded === 1 ? 'stop' : 'stops'
  return {
    amount: rounded.toFixed(1),
    words: `${unit} ${stops < 0 ? 'short' : 'over'}`
  }
}

/**
 * Indices of `shutterSpeeds` that sit a whole stop apart, for the marks under
 * the slider.
 *
 * Found by walking doublings from the fastest speed and taking the nearest
 * entry to each, rather than by stepping every third index. The table is not a
 * clean 1/3-stop series - it also carries the video speeds 1/120 and 1/240,
 * which sit 0.06 stop from their stills neighbours - so counting by threes
 * drifts off the whole stops after 1/250 s.
 */
export const shutterIndicesEveryStops = (stops: number): number[] => {
  const fastest = shutterSpeeds[0]!.value
  const slowest = shutterSpeeds[shutterSpeeds.length - 1]!.value
  const marks = new Set<number>()

  for (let step = 0; fastest * Math.pow(2, step * stops) <= slowest * 1.5; step++) {
    const target = fastest * Math.pow(2, step * stops)
    let nearest = 0
    for (let i = 1; i < shutterSpeeds.length; i++) {
      const candidate = Math.abs(Math.log2(shutterSpeeds[i]!.value / target))
      const chosen = Math.abs(Math.log2(shutterSpeeds[nearest]!.value / target))
      if (candidate < chosen) nearest = i
    }
    marks.add(nearest)
  }

  return [...marks].sort((a, b) => a - b)
}

/** Small marks under the shutter slider: one per whole stop. */
export const wholeStopShutterIndices: number[] = shutterIndicesEveryStops(1)

/**
 * The handful of marks that also carry a printed number.
 *
 * Every third stop, which lands on 1/8000, 1/1000, 1/125, 1/15, 0.5 s, 4.0 s
 * and 30 s - seven numbers a photographer reads without thinking, spread evenly
 * along the track because even spacing in stops is what the log scale draws.
 * Every second stop gives ten, which crowd on a phone; every fourth gives five,
 * which is too sparse to navigate by.
 */
export const labelledShutterIndices: number[] = shutterIndicesEveryStops(3)
