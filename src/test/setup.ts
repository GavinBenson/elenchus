import { afterEach } from 'vitest'

/**
 * Fail the run rather than let a destructive suite loose on the wrong database.
 * vitest.config.ts overrides DATABASE_URL with TEST_DATABASE_URL; if that
 * override ever stops taking effect, every test file would silently start
 * wiping the development database again.
 */
if (process.env.TEST_DATABASE_URL && process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is set but DATABASE_URL was not overridden with it. ' +
      'The test suite is destructive — refusing to run against the app database.'
  )
}

/**
 * React Testing Library only self-registers its cleanup when `globals: true`
 * is set, which this project deliberately does not use. Without cleanup,
 * DOM from one test leaks into the next and queries start matching stale
 * elements — tests that pass for the wrong reason.
 *
 * RTL is imported lazily inside the hook so that node-environment test files
 * (the API and database tests, which are most of this suite) never load it.
 */
afterEach(async () => {
  if (typeof document === 'undefined') return
  const { cleanup } = await import('@testing-library/react')
  cleanup()
})
