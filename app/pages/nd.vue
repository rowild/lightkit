<script setup lang="ts">
import NdFilters from '../components/NdFilters.vue'

// The ND tool is built to fit one screen: the dial takes whatever height the
// fixed rows leave it. Saying so here lets the shell cap itself and stop the
// page scrolling. The solar page never sets this, so its map is unaffected.
definePageMeta({ fitViewport: true })

useHead({ title: 'ND Filters // LightKit' })
</script>

<template>
  <!-- h-0 with grow, on every size and not just lg: a zero basis makes this
       take exactly the space the flex parent has left, which is the whole
       point of the fitViewport flag. -->
  <div class="grow min-h-0 h-0 animate-panel">
    <ClientOnly>
      <NdFilters />
    </ClientOnly>
  </div>
</template>
