import 'dotenv/config'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Node by default — most tests here are API/DB tests. Component tests opt
    // into jsdom with a `// @vitest-environment jsdom` docblock.
    environment: 'node',
    // All test files share the single real database in DATABASE_URL, and
    // prisma/seed.test.ts reseeds it, so files must not run concurrently.
    fileParallelism: false,
  },
})
