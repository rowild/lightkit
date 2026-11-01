<template>
  <!-- Drawn in the coordinates of the picture underneath (1200 x 1000, same crop),
       so the bow stands on the planet's real limb. The sun takes half a minute to
       cross, and the air along the limb turns gold as it sinks, then blue once it
       has gone. The same picture as the sky view, told as a small ritual. -->
  <svg viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="solar-rim-gold" gradientUnits="userSpaceOnUse" cx="600" cy="1534" r="1046">
        <stop offset="0.9" stop-color="#ffb347" stop-opacity="0" />
        <stop offset="0.941" stop-color="#ffb347" stop-opacity="0.95" />
        <stop offset="1" stop-color="#ff7a2b" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="solar-rim-blue" gradientUnits="userSpaceOnUse" cx="600" cy="1534" r="1046">
        <stop offset="0.9" stop-color="#6fc3ff" stop-opacity="0" />
        <stop offset="0.941" stop-color="#6fc3ff" stop-opacity="0.95" />
        <stop offset="1" stop-color="#2b5dff" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="solar-sun">
        <stop offset="0" stop-color="#fff6df" />
        <stop offset="0.14" stop-color="#ffd27a" />
        <stop offset="0.42" stop-color="#ffb347" stop-opacity="0.32" />
        <stop offset="1" stop-color="#ffb347" stop-opacity="0" />
      </radialGradient>
      <!-- Measured from the place, so each fan dies out on its way to the bow. -->
      <radialGradient id="solar-fan-gold" gradientUnits="userSpaceOnUse" cx="600" cy="550" r="440">
        <stop offset="0" stop-color="#ffb347" stop-opacity="0.5" />
        <stop offset="1" stop-color="#ffb347" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="solar-fan-blue" gradientUnits="userSpaceOnUse" cx="600" cy="550" r="440">
        <stop offset="0" stop-color="#6fc3ff" stop-opacity="0.45" />
        <stop offset="1" stop-color="#6fc3ff" stop-opacity="0" />
      </radialGradient>
    </defs>

    <circle class="rim rim-gold" cx="600" cy="1534" r="1046" fill="url(#solar-rim-gold)" />
    <circle class="rim rim-blue" cx="600" cy="1534" r="1046" fill="url(#solar-rim-blue)" />

    <!-- Fans from the place on top of the planet to the low ends of the bow. -->
    <g class="fans">
      <path class="fan fan-gold" d="M600 550 L171 542 L200 460 Z" fill="url(#solar-fan-gold)" />
      <path class="fan fan-gold" d="M600 550 L1029 542 L1000 460 Z" fill="url(#solar-fan-gold)" />
      <path class="fan fan-blue" d="M600 550 L164 600 L171 542 Z" fill="url(#solar-fan-blue)" />
      <path class="fan fan-blue" d="M600 550 L1036 600 L1029 542 Z" fill="url(#solar-fan-blue)" />
    </g>

    <!-- The bow, with a bead for each hour. -->
    <circle cx="600" cy="640" r="440" fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="1.5" pathLength="360" stroke-dasharray="200 160" transform="rotate(-190 600 640)" />
    <g>
      <circle
        v-for="(bead, i) in beads"
        :key="i"
        class="bead"
        :cx="bead.x"
        :cy="bead.y"
        r="4"
        fill="#ffe2ad"
        :style="{ animationDelay: `${bead.delay}s` }"
      />
    </g>

    <g class="sun">
      <circle cx="600" cy="200" r="96" fill="url(#solar-sun)" />
    </g>

    <!-- The place. -->
    <circle class="pulse" cx="600" cy="550" r="10" fill="none" stroke="#fff" stroke-width="2" />
    <circle cx="600" cy="550" r="4.5" fill="#fff" />
  </svg>
</template>

<script setup lang="ts">
/** The Solar Planner plate's animation. Decoration only, hidden from readers. */
const beads = Array.from({ length: 13 }, (_, i) => {
  const angle = ((i - 6) * 13.5 * Math.PI) / 180
  return {
    x: Math.round(600 + Math.sin(angle) * 440),
    y: Math.round(640 - Math.cos(angle) * 440),
    delay: -i * 1.7
  }
})
</script>

<style scoped>
.sun {
  transform-box: view-box;
  transform-origin: 600px 640px;
  animation: solar-cross 30s linear infinite;
}

@keyframes solar-cross {
  0% { transform: rotate(-98deg); opacity: 0; }
  7% { opacity: 1; }
  93% { opacity: 1; }
  100% { transform: rotate(98deg); opacity: 0; }
}

/* Gold while the sun is low, blue once it is under the limb. The two are keyed to
   the same 30 seconds as the sun, so the sky always agrees with it. */
.rim {
  mix-blend-mode: screen;
}

.rim-gold {
  animation: solar-gold 30s linear infinite;
}

.rim-blue {
  animation: solar-blue 30s linear infinite;
}

@keyframes solar-gold {
  0%, 2% { opacity: 0; }
  14% { opacity: 1; }
  30%, 70% { opacity: 0.15; }
  86% { opacity: 1; }
  98%, 100% { opacity: 0; }
}

@keyframes solar-blue {
  0% { opacity: 0.85; }
  10% { opacity: 0; }
  90% { opacity: 0; }
  100% { opacity: 0.85; }
}

/* Reduced motion stops every keyframe, so these rest at a visible dusk. */
.rim-gold,
.rim-blue {
  opacity: 0.5;
}

.fan-gold {
  animation: solar-gold 30s linear infinite;
}

.fan-blue {
  animation: solar-blue 30s linear infinite;
}

.bead {
  opacity: 0.45;
  animation: solar-twinkle 5.5s ease-in-out infinite;
}

@keyframes solar-twinkle {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.95; }
}

.pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: solar-pulse 4.5s ease-out infinite;
}

@keyframes solar-pulse {
  0% { transform: scale(0.8); opacity: 0.9; }
  70%, 100% { transform: scale(4.2); opacity: 0; }
}
</style>
