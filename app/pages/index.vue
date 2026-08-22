<script setup lang="ts">
/**
 * `/` is not a tool, it is a doorway. It sends the visitor to the first tool so
 * every tool has one canonical URL and none of them is the accidental default.
 */
import { tools } from '../data/tools'

await navigateTo(tools[0]!.path, { replace: true })
</script>

<template>
  <div />
</template>
