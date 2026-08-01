// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppSidebar } from './AppSidebar'
import { navItemsFor } from '@/lib/nav'

const { usePathnameMock, useRouterMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => '/dashboard'),
  useRouterMock: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}))

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
}))

const ALL_PERMISSIONS = new Set([
  'view_all_employees',
  'edit_employees',
  'edit_job_postings',
  'delete_applicant',
  'manage_roles',
])

beforeEach(() => {
  usePathnameMock.mockReturnValue('/dashboard')
})

describe('AppSidebar', () => {
  it('renders every nav item passed in with its testId, as an anchor to its href', () => {
    const items = navItemsFor(ALL_PERMISSIONS)
    render(<AppSidebar items={items} userEmail="a@elenchus.test" roleName="admin" />)

    for (const item of items) {
      const el = screen.getByTestId(item.testId)
      expect(el.tagName).toBe('A')
      expect(el).toHaveAttribute('href', item.href)
    }
  })

  it('omits a restricted user\'s gated links while keeping ungated ones', () => {
    const items = navItemsFor(new Set())
    render(<AppSidebar items={items} userEmail="a@elenchus.test" roleName="employee" />)

    expect(screen.queryByTestId('nav-link-employees')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nav-link-admin-roles')).not.toBeInTheDocument()
    expect(screen.getByTestId('nav-link-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('nav-link-applicants')).toBeInTheDocument()
    expect(screen.getByTestId('nav-link-job-postings')).toBeInTheDocument()
  })

  it('renders the shell\'s own test ids', () => {
    const items = navItemsFor(ALL_PERMISSIONS)
    render(<AppSidebar items={items} userEmail="a@elenchus.test" roleName="admin" />)

    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('logout-button')).toBeInTheDocument()
  })

  it('marks the active link, including on a nested route, without marking others', () => {
    const items = navItemsFor(ALL_PERMISSIONS)

    usePathnameMock.mockReturnValue('/applicants')
    const { unmount } = render(
      <AppSidebar items={items} userEmail="a@elenchus.test" roleName="admin" />
    )
    expect(screen.getByTestId('nav-link-applicants')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('nav-link-dashboard')).not.toHaveAttribute('aria-current')
    unmount()

    usePathnameMock.mockReturnValue('/applicants/some-id')
    render(<AppSidebar items={items} userEmail="a@elenchus.test" roleName="admin" />)
    expect(screen.getByTestId('nav-link-applicants')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('nav-link-dashboard')).not.toHaveAttribute('aria-current')
  })

  it('renders both theme labels in the markup, one hidden per theme by CSS', () => {
    const items = navItemsFor(ALL_PERMISSIONS)
    render(<AppSidebar items={items} userEmail="a@elenchus.test" roleName="admin" />)

    expect(screen.getByText('Dark mode')).toBeInTheDocument()
    expect(screen.getByText('Light mode')).toBeInTheDocument()
  })

  it('gives the theme toggle a real accessible name, not a generic aria-label', () => {
    const items = navItemsFor(ALL_PERMISSIONS)
    render(<AppSidebar items={items} userEmail="a@elenchus.test" roleName="admin" />)

    expect(screen.getByRole('button', { name: /mode/i })).toBeInTheDocument()
  })
})
