import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { navItemsFor } from './nav'

/**
 * nav.test.ts proves navItemsFor filters on the permission strings nav.ts
 * declares. It cannot prove those strings are the ones the pages actually
 * enforce. If a later PBI tightens a page to a different permission key and
 * nobody updates nav.ts, the sidebar renders a link that bounces the user
 * straight back to /dashboard — a dead link no existing test notices.
 *
 * Mapped explicitly rather than derived from the href: route groups like
 * `(app)` make any clever derivation quietly wrong.
 */
const PAGE_FOR_HREF: Record<string, string> = {
  '/dashboard': 'src/app/(app)/dashboard/page.tsx',
  '/applicants': 'src/app/(app)/applicants/page.tsx',
  '/job-postings': 'src/app/(app)/job-postings/page.tsx',
  '/employees': 'src/app/(app)/employees/page.tsx',
  '/admin/roles': 'src/app/(app)/admin/roles/page.tsx',
}

const REPO_ROOT = path.resolve(__dirname, '..', '..')

function readPage(href: string): Promise<string> {
  const rel = PAGE_FOR_HREF[href]
  expect(rel, `no page mapped for nav href ${href}`).toBeDefined()
  return readFile(path.join(REPO_ROOT, rel), 'utf8')
}

// Every item, regardless of permission, so the gate check covers them all.
const ALL_ITEMS = navItemsFor(
  new Set([
    'view_all_employees',
    'edit_employees',
    'edit_job_postings',
    'delete_applicant',
    'manage_roles',
  ])
)

describe('nav permissions match the gates their pages enforce', () => {
  it('maps every nav item to a page file', () => {
    for (const item of ALL_ITEMS) {
      expect(Object.keys(PAGE_FOR_HREF)).toContain(item.href)
    }
  })

  for (const item of ALL_ITEMS.filter((i) => i.permission)) {
    it(`${item.href} enforces requirePermission('${item.permission}')`, async () => {
      const source = await readPage(item.href)
      expect(source).toContain(`requirePermission('${item.permission}')`)
    })
  }

  for (const item of ALL_ITEMS.filter((i) => !i.permission)) {
    it(`${item.href} is gated by requireSession() alone`, async () => {
      const source = await readPage(item.href)
      expect(source).toContain('requireSession()')
      expect(source).not.toContain('requirePermission(')
    })
  }
})
