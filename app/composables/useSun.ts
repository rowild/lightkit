import SunCalc from 'suncalc'

// Register custom solar times for LightKit:
// -8°: Start of Blue Hour (morning) / End of Blue Hour (evening)
// -4°: End of Blue Hour (morning) / Start of Blue Hour (evening)
try {
  SunCalc.addTime(-8, 'blueHourMornStart', 'blueHourEveEnd')
  SunCalc.addTime(-4, 'blueHourMornEnd', 'blueHourEveStart')
} catch (e) {
  console.warn('Custom solar times registration warning:', e)
}

export interface SolarTimes {
  dawn: Date
  sunrise: Date
  sunriseEnd: Date
  goldenHourEnd: Date
  solarNoon: Date
  goldenHour: Date
  sunsetStart: Date
  sunset: Date
  dusk: Date
  nadir: Date
  blueHourMornStart?: Date
  blueHourMornEnd?: Date
  blueHourEveStart?: Date
  blueHourEveEnd?: Date
}

export interface SolarSegment {
  name: string
  start: Date
  end: Date
  colorClass: string
  description: string
}

export const useSun = () => {
  // Helper to validate dates
  const isValid = (d: any): boolean => d instanceof Date && !isNaN(d.getTime())

  /**
   * Calculates all solar times for a given date and coordinates.
   */
  const getSolarTimes = (date: Date, lat: number, lng: number): SolarTimes => {
    try {
      const times = SunCalc.getTimes(date, lat, lng) as any
      return {
        dawn: times.dawn,
        sunrise: times.sunrise,
        sunriseEnd: times.sunriseEnd,
        goldenHourEnd: times.goldenHourEnd,
        solarNoon: times.solarNoon,
        goldenHour: times.goldenHour,
        sunsetStart: times.sunsetStart,
        sunset: times.sunset,
        dusk: times.dusk,
        nadir: times.nadir,
        blueHourMornStart: times.blueHourMornStart,
        blueHourMornEnd: times.blueHourMornEnd,
        blueHourEveStart: times.blueHourEveStart,
        blueHourEveEnd: times.blueHourEveEnd
      }
    } catch (e) {
      console.error('Error calculating solar times', e)
      const now = new Date(date)
      return {
        dawn: new Date(now.setHours(5, 0, 0)),
        sunrise: new Date(now.setHours(6, 0, 0)),
        sunriseEnd: new Date(now.setHours(6, 30, 0)),
        goldenHourEnd: new Date(now.setHours(7, 30, 0)),
        solarNoon: new Date(now.setHours(12, 0, 0)),
        goldenHour: new Date(now.setHours(19, 30, 0)),
        sunsetStart: new Date(now.setHours(20, 30, 0)),
        sunset: new Date(now.setHours(21, 0, 0)),
        dusk: new Date(now.setHours(21, 45, 0)),
        nadir: new Date(now.setHours(0, 0, 0)),
        blueHourMornStart: new Date(now.setHours(4, 30, 0)),
        blueHourMornEnd: new Date(now.setHours(5, 15, 0)),
        blueHourEveStart: new Date(now.setHours(21, 15, 0)),
        blueHourEveEnd: new Date(now.setHours(21, 45, 0))
      }
    }
  }

  /**
   * Calculates current sun position (altitude & azimuth in degrees)
   */
  const getSunPosition = (date: Date, lat: number, lng: number) => {
    try {
      const pos = SunCalc.getPosition(date, lat, lng)
      const altitudeDeg = pos.altitude * (180 / Math.PI)
      const azimuthDeg = (pos.azimuth * (180 / Math.PI) + 180) % 360

      return {
        altitude: altitudeDeg,
        azimuth: azimuthDeg
      }
    } catch (e) {
      return { altitude: 0, azimuth: 0 }
    }
  }

  /**
   * Groups a day into visual segments based on specific solar elevations.
   * Dynamically filters out segments that do not occur (e.g. during Arctic summers/winters)
   * to prevent NaN duration calculations.
   */
  const getSolarSegments = (date: Date, lat: number, lng: number): SolarSegment[] => {
    const times = getSolarTimes(date, lat, lng)
    
    // Tomorrow's times for next nadir
    const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    const nextTimes = getSolarTimes(tomorrow, lat, lng)
    
    const startDay = times.nadir
    const endDay = nextTimes.nadir
    
    if (!isValid(startDay) || !isValid(endDay)) {
      return []
    }
    
    // Candidates for transition times
    const candidates = [
      times.nadir,
      times.blueHourMornStart,
      times.blueHourMornEnd,
      times.sunrise,
      times.goldenHourEnd,
      times.goldenHour,
      times.sunset,
      times.blueHourEveStart,
      times.blueHourEveEnd,
      nextTimes.nadir,
      nextTimes.blueHourMornStart,
      nextTimes.blueHourMornEnd,
      nextTimes.sunrise,
      nextTimes.goldenHourEnd
    ]
    
    // Filter candidates that are valid and lie within [startDay, endDay]
    const validTimes = candidates
      .filter(d => isValid(d))
      .map(d => d!.getTime())
      .filter(t => t >= startDay.getTime() && t <= endDay.getTime())
      
    // Remove duplicates (within 1000ms)
    const uniqueTimes: number[] = []
    for (const t of validTimes) {
      if (!uniqueTimes.some(ut => Math.abs(ut - t) < 1000)) {
        uniqueTimes.push(t)
      }
    }
    
    // Sort chronologically
    uniqueTimes.sort((a, b) => a - b)
    
    const segments: SolarSegment[] = []
    const noon = times.solarNoon.getTime()
    
    for (let i = 0; i < uniqueTimes.length - 1; i++) {
      const start = new Date(uniqueTimes[i])
      const end = new Date(uniqueTimes[i + 1])
      const midpoint = new Date((uniqueTimes[i] + uniqueTimes[i + 1]) / 2)
      
      // Get sun position at midpoint
      const pos = getSunPosition(midpoint, lat, lng)
      const alt = pos.altitude
      
      let name = ''
      let colorClass = ''
      let description = ''
      
      if (alt > 6) {
        name = 'Daylight'
        colorClass = 'bg-brand-petrol-800/10 text-brand-petrol-300'
        description = 'Standard flying. Direct overhead sunlight, strong contrast.'
      } else if (alt > 0) {
        if (midpoint.getTime() < noon) {
          name = 'Morning Golden Hour'
          colorClass = 'bg-brand-glow-amber/35 text-brand-glow-amber border-b-2 border-brand-glow-amber'
          description = 'Golden hour: Sun is between 0° and 6° above the horizon. Warm atmospheric glow, long dramatic shadows.'
        } else {
          name = 'Evening Golden Hour'
          colorClass = 'bg-brand-glow-amber/35 text-brand-glow-amber border-b-2 border-brand-glow-amber'
          description = 'Golden hour: Sun is between 6° and 0° above the horizon. Soft, warm diffused light. The absolute peak flight window for cinematic warmth.'
        }
      } else if (alt > -4) {
        name = 'Civil Twilight Transition'
        colorClass = 'bg-brand-petrol-900/10 text-brand-petrol-400'
        description = 'Sun rises/sets close to the horizon (between -4° and 0°). Muted transition light.'
      } else if (alt > -8) {
        if (midpoint.getTime() < noon) {
          name = 'Morning Blue Hour'
          colorClass = 'bg-brand-glow-cyan/35 text-brand-glow-cyan border-b-2 border-brand-glow-cyan'
          description = 'Blue hour: Sun is between 4° and 8° below the horizon. Saturated cool, deep blue tones. Moody light, perfect for landscapes.'
        } else {
          name = 'Evening Blue Hour'
          colorClass = 'bg-brand-glow-cyan/35 text-brand-glow-cyan border-b-2 border-brand-glow-cyan'
          description = 'Blue hour: Sun is between 4° and 8° below the horizon. Moody, cool, deep blue scattering. Blends beautifully with warm artificial city lights.'
        }
      } else {
        name = 'Night'
        colorClass = 'bg-brand-petrol-800/[0.04] dark:bg-brand-green-800/45 text-gray-500'
        description = 'Civil twilight has ended. Strobe lights are required for drone flight. Check local night regulations.'
      }
      
      segments.push({
        name,
        start,
        end,
        colorClass,
        description
      })
    }
    
    return segments
  }

  /**
   * Determine current segment based on time
   */
  const getCurrentSegment = (currentDate: Date, segments: SolarSegment[]): SolarSegment | null => {
    const time = currentDate.getTime()
    for (const segment of segments) {
      if (time >= segment.start.getTime() && time < segment.end.getTime()) {
        return segment
      }
    }
    // Fallback if before first or after last
    if (segments.length > 0) {
      if (time < segments[0].start.getTime()) {
        return {
          ...segments[segments.length - 1],
          start: new Date(segments[0].start.getTime() - 8 * 60 * 60 * 1000),
          end: segments[0].start
        }
      }
      return segments[segments.length - 1]
    }
    return null
  }

  return {
    getSolarTimes,
    getSunPosition,
    getSolarSegments,
    getCurrentSegment
  }
}
