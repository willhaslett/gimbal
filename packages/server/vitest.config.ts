import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only run unit tests by default (files in src/**/*.test.ts)
    include: ['src/**/*.test.ts'],
    // Exclude e2e tests (they hit real APIs)
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
