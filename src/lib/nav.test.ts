import { describe, it, expect } from 'vitest'
import { navItemsFor } from './nav'

describe('navItemsFor', () => {
  it('always shows Dashboard and Applicants, which need no permission', () => {
    const items = navItemsFor(new Set())
    expect(items.map((i) => i.label)).toContain('Dashboard')
    expect(items.map((i) => i.label)).toContain('Applicants')
  })

  it('hides Employees from a user without view_all_employees', () => {
    const items = navItemsFor(new Set())
    expect(items.map((i) => i.label)).not.toContain('Employees')
  })

  it('shows Employees to a user with view_all_employees', () => {
    const items = navItemsFor(new Set(['view_all_employees']))
    expect(items.map((i) => i.label)).toContain('Employees')
  })

  it('hides the roles admin from a user without manage_roles', () => {
    const items = navItemsFor(new Set(['view_all_employees']))
    expect(items.map((i) => i.href)).not.toContain('/admin/roles')
  })

  it('shows the roles admin to a user with manage_roles', () => {
    const items = navItemsFor(new Set(['manage_roles']))
    expect(items.map((i) => i.href)).toContain('/admin/roles')
  })

  it('gives an admin every item', () => {
    const all = navItemsFor(
      new Set([
        'view_all_employees',
        'edit_employees',
        'edit_job_postings',
        'delete_applicant',
        'manage_roles',
      ])
    )
    const none = navItemsFor(new Set())
    expect(all.length).toBeGreaterThan(none.length)
  })

  it('gives every item a unique, stable test id', () => {
    const items = navItemsFor(new Set(['view_all_employees', 'manage_roles']))
    const ids = items.map((i) => i.testId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('nav-link-'))).toBe(true)
  })
})
