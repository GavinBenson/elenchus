import { describe, it, expect } from 'vitest'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { navItemsFor } from '@/lib/nav'

/**
 * Test IDs are a contract with the Playwright suite (Epic 2). Epic 6 rewrites
 * every screen's markup, so this test freezes the IDs that already exist: an
 * ID may move to a different element serving the same purpose, but it may not
 * disappear. Add new IDs here as they are introduced.
 */
const FROZEN_TEST_IDS = [
  'applicant-detail',
  'applicant-email',
  'applicant-job-posting',
  'applicant-name',
  'applicant-pipeline',
  'applicant-stage',
  'applicants-list',
  'dashboard-admin',
  'dashboard-employee',
  'dashboard-manager',
  'dashboard-recruiter',
  'employee-department',
  'employee-detail',
  'employee-status',
  'employee-title',
  'employees-list',
  'job-posting-detail',
  'job-postings-list',
  'login-email',
  'login-error',
  'login-form',
  'login-password',
  'login-submit',
  'manager-reports-list',
  'recruiter-postings-list',
  'roles-list',
  'stage-error',
  'stat-applicant-count',
  'stat-employee-count',
  'stat-posting-count',
  // Added by the app shell (PBI 6.5).
  'app-sidebar',
  'user-menu',
  'theme-toggle',
  'logout-button',
  // Added by the UI primitives (PBI 6.4).
  'page-subtitle',
  // Added by the applicants list (PBI 6.6).
  'applicants-search',
  'filter-stage',
  'filter-role',
  'empty-state',
  'loading-skeleton',
  'error-state',
  // Added by the pipeline board (PBI 6.7).
  'board-error',
]

/**
 * Dynamic ids are built from a template literal, so they never appear as a
 * complete string in source. Match the template prefix instead.
 */
const FROZEN_TEMPLATES = [
  'applicant-row-${',
  'employee-row-${',
  'stage-button-${',
  'role-row-${',
  'pipeline-column-${',
  'applicant-card-${',
  'posting-row-${',
  // Added by the pipeline board (PBI 6.7).
  'board-column-${',
  'board-card-${',
]

/**
 * The nav ids never appear beside `data-testid=` in source: they are declared
 * as `testId` values in src/lib/nav.ts and reach the DOM via
 * `data-testid={item.testId}`. Assert them against what navItemsFor actually
 * returns, which is stronger than any string match over the source.
 */
const FROZEN_NAV_TEST_IDS = [
  'nav-link-dashboard',
  'nav-link-applicants',
  'nav-link-job-postings',
  'nav-link-employees',
  'nav-link-admin-roles',
]

const ALL_PERMISSIONS = new Set([
  'view_all_employees',
  'edit_employees',
  'edit_job_postings',
  'delete_applicant',
  'manage_roles',
])

/** src/generated is a ~600 KB generated Prisma client; scanning it only
 *  creates surface for an accidental substring match to hide on. */
const IGNORED_DIRS = new Set(['generated'])

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return IGNORED_DIRS.has(entry.name) ? [] : collectSourceFiles(full)
      }
      return entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') ? [full] : []
    })
  )
  return files.flat()
}

/**
 * Match the attribute, not a bare quoted string. `haystack.includes('"login-error"')`
 * is satisfied by a comment, an unrelated array, or `id="login-error"` — so a
 * restyle that renamed the attribute would keep this test green while breaking
 * every Playwright selector.
 */
function hasTestIdAttribute(haystack: string, id: string): boolean {
  return (
    haystack.includes(`data-testid="${id}"`) ||
    haystack.includes(`data-testid='${id}'`) ||
    haystack.includes(`data-testid={\`${id}`)
  )
}

describe('data-testid contract', () => {
  it('never drops a test id the Playwright suite depends on', async () => {
    const files = await collectSourceFiles(path.resolve(__dirname, '..'))
    const sources = await Promise.all(
      files
        .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
        .map((f) => readFile(f, 'utf8'))
    )
    const haystack = sources.join('\n')

    const missing = FROZEN_TEST_IDS.filter((id) => !hasTestIdAttribute(haystack, id))
    expect(missing).toEqual([])

    const missingTemplates = FROZEN_TEMPLATES.filter(
      (t) => !haystack.includes(`data-testid={\`${t}`)
    )
    expect(missingTemplates).toEqual([])
  })

  it('never drops a nav test id', () => {
    const ids = navItemsFor(ALL_PERMISSIONS).map((i) => i.testId)
    // Order-insensitive: a later PBI may reorder the sidebar without that
    // being a contract breach. Only a dropped id should fail this test.
    expect(new Set(ids)).toEqual(new Set(FROZEN_NAV_TEST_IDS))
    expect(ids).toHaveLength(FROZEN_NAV_TEST_IDS.length)
  })
})
