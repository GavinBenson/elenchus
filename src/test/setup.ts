import { afterEach } from 'vitest'

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
