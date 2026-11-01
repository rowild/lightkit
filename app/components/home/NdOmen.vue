<template>
  <!-- An eclipse, which is all an ND filter is: a dark disc passes over the sun and
       the light falls, leaving only the corona. Around it two dial rings carry the
       filter strengths, turning against each other like an astrolabe. -->
  <svg viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="nd-sun">
        <stop offset="0" stop-color="#fff6df" />
        <stop offset="0.3" stop-color="#ffd27a" />
        <stop offset="0.5" stop-color="#ffb347" stop-opacity="0.42" />
        <stop offset="1" stop-color="#ffb347" stop-opacity="0" />
      </radialGradient>
      <path id="nd-dial-path" d="M600 112 a268 268 0 1 1 -0.01 0" />
    </defs>

    <g class="ring ring-slow">
      <circle cx="600" cy="380" r="296" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="1" pathLength="360" stroke-dasharray="0.4 4.6" />
      <text v-for="(label, i) in STRENGTHS" :key="label" class="dial-text" fill="#fff" fill-opacity="0.55">
        <textPath href="#nd-dial-path" :startOffset="`${(i * 100) / STRENGTHS.length}%`">{{ label }}</textPath>
      </text>
    </g>

    <g class="ring ring-counter">
      <circle cx="600" cy="380" r="232" fill="none" stroke="#8cc0e6" stroke-opacity="0.4" stroke-width="1" pathLength="360" stroke-dasharray="6 24" />
    </g>

    <circle class="sun" cx="600" cy="380" r="200" fill="url(#nd-sun)" />
    <circle class="corona" cx="600" cy="380" r="100" fill="none" stroke="#ffd27a" stroke-width="2.5" />
    <circle class="disc" cx="600" cy="380" r="98" fill="#04070b" />
  </svg>
</template>

<script setup lang="ts">
/** The ND Filters plate's animation. Decoration only, hidden from readers. */
const STRENGTHS = ['ND2', 'ND4', 'ND8', 'ND16', 'ND32', 'ND64', 'ND128', 'ND256', 'ND512', 'ND1000']
</script>

<style scoped>
.dial-text {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 300;
  letter-spacing: 0.04em;
}

.ring {
  transform-box: view-box;
  transform-origin: 600px 380px;
}

.ring-slow {
  animation: nd-turn 150s linear infinite;
}

.ring-counter {
  animation: nd-turn 90s linear infinite reverse;
}

@keyframes nd-turn {
  to { transform: rotate(360deg); }
}

.disc {
  animation: nd-pass 22s ease-in-out infinite;
}

@keyframes nd-pass {
  0%, 8% { transform: translateX(-420px); }
  50% { transform: translateX(0); }
  92%, 100% { transform: translateX(420px); }
}

/* Light falls as the disc closes, and only then does the corona show. */
.sun {
  animation: nd-dim 22s ease-in-out infinite;
}

@keyframes nd-dim {
  0%, 22%, 78%, 100% { opacity: 1; }
  50% { opacity: 0.32; }
}

.corona {
  opacity: 0;
  animation: nd-corona 22s ease-in-out infinite;
}

@keyframes nd-corona {
  0%, 38%, 62%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
</style>
