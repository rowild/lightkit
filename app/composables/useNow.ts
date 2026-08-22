import { ref, onMounted, onUnmounted } from 'vue'

/**
 * A ref holding the current time, updated once a second while the component is
 * mounted.
 *
 * One instance per component, not a shared one. `SunTimeline.vue` used to own
 * the only clock in the app; splitting it into `DaySchedule` and `LightState`
 * meant two components needed the same thing, and copying five lines of timer
 * plumbing into both is how the two drift apart later.
 *
 * Deliberately NOT backed by `useState`. A shared clock is state the whole app
 * would have to agree on for no gain: nothing here compares one component's
 * `now` against another's, and a module-level ref would leak between requests
 * under SSR. The timer only ever runs on the client, so the server renders the
 * mount-time value and hydration replaces it on the first tick.
 */
export const useNow = (intervalMs = 1000) => {
  const now = ref(new Date())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date()
    }, intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return now
}
