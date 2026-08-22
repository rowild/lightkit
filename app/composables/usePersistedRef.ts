import { ref, watch, onMounted, getCurrentInstance, type Ref } from 'vue'

const NAMESPACE = 'dpt:'

/** Read a persisted value without creating a ref. Safe to call any time on the client. */
export const readPersisted = <T>(key: string, fallback: T): T => {
  if (!import.meta.client) return fallback
  try {
    const raw = localStorage.getItem(NAMESPACE + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/**
 * A ref that restores its value from localStorage and writes back on change,
 * so user choices survive a reload.
 *
 * The restore happens on mount, never during setup. Reading during setup makes
 * the client's first render disagree with the server's HTML, and Vue does not
 * repair that mismatch in production - the stored choice would silently fail to
 * apply to anything rendered on the server.
 *
 * Keys are namespaced under `dpt:` so they cannot collide with anything else
 * this origin stores.
 */
export const usePersistedRef = <T>(key: string, fallback: T): Ref<T> => {
  const storageKey = NAMESPACE + key
  const state = ref<T>(fallback) as Ref<T>

  const startSyncing = () => {
    state.value = readPersisted(key, fallback)

    watch(state, (value) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value))
      } catch {
        // Storage full or blocked (private browsing). The app keeps working;
        // the choice just will not survive a reload.
      }
    }, { deep: true })
  }

  if (import.meta.client) {
    // Outside a component (rare here) there is no mount to wait for.
    if (getCurrentInstance()) {
      onMounted(startSyncing)
    } else {
      startSyncing()
    }
  }

  return state
}
