import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// The modules under test are plain TypeScript with no Vue, no Nuxt and no
// browser APIs, so the `node` environment is enough. Adding happy-dom or
// @nuxt/test-utils would slow every run down for behaviour nothing here uses.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts']
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})
