# Implementation Plan - Multi-App Navigation & ND Filters Calculator

This plan details the addition of a tab-based navigation system in the header to switch between the existing "Solar Planner" and a new "ND Filters" app. It also outlines the creation of a premium, fully functional ND Filters Calculator component.

## User Review Required

> [!IMPORTANT]
> - **Header Navigation**: We will transform the subtitle `// Solar Planner` in the header into two interactive tab buttons (`// Solar Planner` and `// ND Filters`), separated by a vertical bar `|`. The active app will be styled in the brand amber highlight color.
> - **ND Filters Calculator (Interactive)**: Although a "dummy text" was mentioned, we propose building a fully functional, premium ND Filters Calculator interface. This includes:
>   - **Base Shutter Speed Input**: A drop-down selection of standard shutter speeds (from `1/8000s` to `30s`).
>   - **ND Filter Selector**: A grid of selectable filters (ND4/2 stops, ND8/3 stops, ND16/4 stops, ND32/5 stops, ND64/6 stops, ND1000/10 stops, etc.).
>   - **Output Telemetry**: A large, glowing display of the calculated target shutter speed, alongside pilot advice on motion blur (e.g. cinematic motion guidelines).

## Proposed Changes

### [app.vue](file:///Volumes/Work/__MY_WWW/__My%20vibe-coded%20stuff/golden-hour/app/app.vue)
- Add a reactive `activeApp` state (defaulting to `'solar'`).
- Update the header subtitle template block to render `// Solar Planner` and `// ND Filters` as interactive toggle buttons.
- Wrap the main dashboard grid (`v-if="activeApp === 'solar'"`) and the new ND Filters component (`v-else-if="activeApp === 'nd'"`) in a flex-grow area so both occupy the same layout space and respect height scroll constraints.

### [NdFilters.vue](file:///Volumes/Work/__MY_WWW/__My%20vibe-coded%20stuff/golden-hour/app/components/NdFilters.vue)
- Create a new Vue component in `app/components/` containing the calculator UI.
- Implement the calculations: `targetShutterSpeed = baseShutterSpeed * (2 ^ stops)`.
- Use the app's standard typography system (`Josefin Sans` for headers, `Urbanist` for descriptions, and monospace for calculations/seconds values) and glassmorphism panel styles.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify there are no syntax or type compilation errors.

### Manual Verification
- Deploy the dev server and test:
  1. **Tab Switcher**: Click on `// ND Filters`. Verify that the dashboard grid is swapped with the ND Filters Calculator panel, and the footer is still properly anchored at the bottom of the screen.
  2. **Calculator Inputs**: Select a base shutter speed (e.g. `1/100`s) and click on `ND64 (6 stops)`. Verify that the output shutter speed displays `0.64 s` (or close fractional representation like `2/3 s`).
  3. **Revert Switch**: Click on `// Solar Planner`. Verify the original map and timeline restore immediately.
