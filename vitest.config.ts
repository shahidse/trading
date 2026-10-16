import path from 'node:path'
import { defineConfig } from 'vitest/config'

const root = process.cwd()

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})

