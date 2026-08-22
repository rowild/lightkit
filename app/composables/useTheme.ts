/**
 * The one place the resolved light/dark state lives.
 *
 * Three things need it and they are no longer in the same component tree branch:
 * the layout paints the background shader, the menu offers the switch, and the
 * solar page hands it to the map. `useState` keeps them on one value; a plain
 * module-level ref would leak between requests during SSR.
 *
 * This holds the *resolved* boolean only. The three-way choice - light, dark or
 * follow the system - stays in ThemeToggle, which owns the `color-theme` key and
 * the media-query listener.
 */
export const useTheme = () => {
  const isDark = useState<boolean>('is-dark', () => true)

  const setDark = (value: boolean) => {
    isDark.value = value
  }

  return { isDark, setDark }
}
