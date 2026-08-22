<template>
  <div class="flex flex-col gap-5">
    <section class="flex flex-col gap-2">
      <h3 class="t-label">What ND means</h3>
      <p class="t-body-sm">
        ND is short for <strong class="text-ink font-semibold">Neutral Density</strong>.
        Neutral means it does not change colours. Density means it is dark.
      </p>
      <p class="t-body-sm">
        So an ND filter is a piece of dark glass. It changes nothing about your
        picture except how much light gets in. Sunglasses for your lens.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="t-label">What the numbers mean</h3>
      <p class="t-body-sm">
        The number says how much light it blocks. ND8 lets through one eighth of
        the light. ND64 lets through one sixty-fourth.
      </p>
      <p class="t-body-sm">
        Photographers count this in <strong class="text-ink font-semibold">stops</strong>.
        One stop is one halving of light.
      </p>
      <div class="flex flex-col gap-1.5 mt-1">
        <div v-for="row in scale" :key="row.name" class="row-kv">
          <span class="t-num-sm">{{ row.name }}</span>
          <span class="t-body-sm !text-ink-muted">{{ row.stops }}</span>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="t-label">Why video needs them</h3>
      <p class="t-body-sm">
        Video looks natural when the shutter is about half the frame rate. At
        25 frames per second that is 1/50 of a second. This is the
        <strong class="text-ink font-semibold">180 degree rule</strong>.
      </p>
      <p class="t-body-sm">
        On a bright day your camera wants a much faster shutter, like 1/2000.
        That makes movement look sharp and stuttery, like an old news clip.
      </p>
      <p class="t-body-sm">
        You cannot just slow the shutter down, because the shot would be far too
        bright. So you block the extra light with an ND filter and keep the
        shutter where it belongs.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="t-label">Photos work differently</h3>
      <p class="t-body-sm">
        A photo has no frame rate, so there is no shutter rule to obey. Nothing
        forces you to use a filter.
      </p>
      <p class="t-body-sm">
        You reach for one when you <em>want</em> a slow shutter in daylight:
        water turned to mist, clouds drawn into streaks, moving people erased
        from a street. Or to open the lens wide in bright sun so the background
        falls out of focus.
      </p>
    </section>

    <section class="flex flex-col gap-2 border-t border-brand-petrol-800/10 dark:border-brand-green-800/20 pt-4">
      <h3 class="t-label">The short version</h3>
      <p class="t-body-sm">
        In video, an ND filter keeps your shutter where it <em>must</em> be.
      </p>
      <p class="t-body-sm">
        In photos, it lets your shutter go where you <em>want</em> it.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Explains what ND filters are, in plain words. Opened from the app menu.
 *
 * Content only, no dialog chrome: it is rendered inside InfoModal so the shell
 * and the prose stay separable.
 */

// Only the strengths a maker actually sells, so the table matches what a reader
// will see in a shop rather than every mathematical step.
const scale = [
  { name: 'ND2', stops: '1 stop' },
  { name: 'ND4', stops: '2 stops' },
  { name: 'ND8', stops: '3 stops' },
  { name: 'ND16', stops: '4 stops' },
  { name: 'ND32', stops: '5 stops' },
  { name: 'ND64', stops: '6 stops' },
  { name: 'ND1000', stops: '10 stops' }
]
</script>
