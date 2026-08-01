import { describe, it, expect } from 'vitest'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

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
  'nav-link-dashboard',
  'nav-link-applicants',
  'nav-link-job-postings',
  'nav-link-employees',
  'nav-link-admin-roles',
]

/**
 * Dynamic ids are built from a template literal, so they never appear as a
 * complete string in source. Match the template instead.
 */
const FROZEN_TEMPLATES = ['applicant-row-${', 'employee-row-${']

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return collectSourceFiles(full)
      return entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') ? [full] : []
    })
  )
  return files.flat()
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

    const missing = FROZEN_TEST_IDS.filter(
      (id) => !haystack.includes(`"${id}"`) && !haystack.includes(`'${id}'`)
    )
    expect(missing).toEqual([])

    const missingTemplates = FROZEN_TEMPLATES.filter((t) => !haystack.includes(t))
    expect(missingTemplates).toEqual([])
  })
})
