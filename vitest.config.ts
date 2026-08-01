import 'dotenv/config'
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // All test files share the single real database in DATABASE_URL (there is
    // no separate test database), and prisma/seed.test.ts reseeds it by
    // deleting and recreating every row. Running test files in parallel lets
    // that reseed race with other files' reads/writes of the same tables, so
    // file-level parallelism must be disabled.
    fileParallelism: false,
  },
})
