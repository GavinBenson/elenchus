import 'dotenv/config'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * The suite is destructive: `prisma/seed.test.ts` wipes and reseeds whatever
 * database it is pointed at. Point it at `TEST_DATABASE_URL` so a normal
 * `npm test` cannot take out the development database (or a dev server's data
 * mid-session).
 *
 * Falling back to `DATABASE_URL` keeps a fresh checkout runnable without a
 * second database, but that is the old foot-gun, so it warns loudly rather
 * than failing silently.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
if (!process.env.TEST_DATABASE_URL) {
  console.warn(
    '\n[vitest] TEST_DATABASE_URL is not set — running the destructive test ' +
      'suite against DATABASE_URL, which will delete and reseed its data. ' +
      'See .env.example.\n'
  )
}

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
    // Every module that touches the database goes through src/lib/db.ts, which
    // reads DATABASE_URL at import time. Overriding it here (rather than in a
    // setup file) guarantees the swap lands before any import order can beat
    // it.
    env: {
      ...(testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {}),
    },
    // Test files still share one database within a run, and prisma/seed.test.ts
    // reseeds it mid-suite, so files must not run concurrently. TEST_DATABASE_URL
    // isolates the suite from the dev database; it does not isolate test files
    // from each other.
    fileParallelism: false,
    setupFiles: ['./src/test/setup.ts'],
  },
})
