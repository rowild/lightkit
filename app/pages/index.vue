<template>
  <main class="grow flex flex-col gap-8 md:gap-12 pb-2">
    <section class="grid lg:grid-cols-12 gap-x-10 gap-y-5 items-end">
      <div class="lg:col-span-7 min-w-0">
        <h1 class="animate-title start-title">LightKit</h1>
        <p class="animate-panel start-lead">Know what the light will do before you go out.</p>
      </div>
      <!-- Reserves its height, because the reading only exists in the browser. -->
      <div class="lg:col-span-5 min-h-34 animate-panel">
        <ClientOnly>
          <HeroBow />
        </ClientOnly>
      </div>
    </section>

    <section aria-label="Tools">
      <ul class="grid md:grid-cols-2 gap-3 md:gap-5">
        <li v-for="tool in tools" :key="tool.id" class="animate-panel">
          <ToolPlate :label="tool.label" :note="tool.note" :art="tool.art" :to="tool.path">
            <SolarOmen v-if="tool.id === 'solar'" />
            <NdOmen v-else-if="tool.id === 'nd'" />
          </ToolPlate>
        </li>
      </ul>
    </section>

    <section aria-labelledby="planned-heading" class="animate-panel">
      <h2 id="planned-heading" class="t-label mb-3">On the workbench</h2>
      <ul class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <li v-for="tool in plannedTools" :key="tool.id" class="last:col-span-2 md:last:col-span-1">
          <ToolPlate :label="tool.label" :note="tool.note" :art="tool.art" />
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
/**
 * The start page: the project's name and one plate per tool.
 *
 * Reads `tools.ts` and nothing else, so it cannot disagree with the menu about
 * what exists. It used to redirect to the first tool, and a redirect at `/` is
 * what the service worker cached and then could not serve (see sw.js).
 */
import { tools, plannedTools } from '../data/tools'
import ToolPlate from '../components/home/ToolPlate.vue'
import HeroBow from '../components/home/HeroBow.vue'
import SolarOmen from '../components/home/SolarOmen.vue'
import NdOmen from '../components/home/NdOmen.vue'
</script>

<style scoped>
.start-title {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(4.25rem, 17vw, 10.5rem);
  line-height: 0.95;
  letter-spacing: -0.025em;
  /* The L's side bearing, so the stem lines up with the sentence below it. */
  margin-left: -0.055em;
  color: var(--color-brand-petrol-800);
}

[data-theme="dark"] .start-title {
  color: var(--color-brand-glow);
}

.start-lead {
  margin-top: 0.5rem;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(1.125rem, 2.6vw, 1.625rem);
  line-height: 1.25;
  color: var(--color-ink-muted);
}
</style>
