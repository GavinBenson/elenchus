import { hasPermission } from '@/lib/permissions'

export type NavItem = {
  href: string
  label: string
  testId: string
  /** Omitted means every authenticated user sees it. */
  permission?: string
}

const ALL_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', testId: 'nav-link-dashboard' },
  { href: '/applicants', label: 'Applicants', testId: 'nav-link-applicants' },
  { href: '/job-postings', label: 'Job postings', testId: 'nav-link-job-postings' },
  {
    href: '/employees',
    label: 'Employees',
    testId: 'nav-link-employees',
    permission: 'view_all_employees',
  },
  {
    href: '/admin/roles',
    label: 'Roles & permissions',
    testId: 'nav-link-admin-roles',
    permission: 'manage_roles',
  },
]

/**
 * The nav a given user should see. Links they cannot use are not rendered at
 * all rather than rendered and 403ing, so navigation is a visible projection
 * of their effective permissions.
 */
export function navItemsFor(permissions: Set<string>): NavItem[] {
  return ALL_ITEMS.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission)
  )
}
