// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

/**
 * Drawer behaviour (PBI 6.15). jsdom has no layout, so `matchMedia` is stubbed
 * to say which side of the `lg` breakpoint we are on — that is the same signal
 * the component uses, so these tests exercise the real branch rather than a
 * simulation of it.
 */
function setViewport(isDesktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: isDesktop,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

function renderSidebar() {
  return render(
    <AppSidebar
      items={navItemsFor(ALL_PERMISSIONS)}
      userEmail="admin@elenchus.test"
      roleName="admin"
    />
  )
}

describe('AppSidebar — mobile drawer', () => {
  beforeEach(() => {
    setViewport(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders exactly one sidebar, so no selector matches twice', () => {
    renderSidebar()
    expect(screen.getAllByTestId('app-sidebar')).toHaveLength(1)
    expect(screen.getAllByTestId('nav-link-dashboard')).toHaveLength(1)
  })

  it('keeps every shell test id present at mobile width', () => {
    renderSidebar()
    for (const id of ['app-sidebar', 'user-menu', 'theme-toggle', 'logout-button']) {
      expect(screen.getByTestId(id)).toBeInTheDocument()
    }
  })

  it('starts closed and hides the drawer from the keyboard', () => {
    renderSidebar()
    expect(screen.getByTestId('nav-toggle')).toHaveAttribute('aria-expanded', 'false')
    // Without this a keyboard user tabs into off-screen navigation.
    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('inert')
    expect(screen.queryByTestId('nav-backdrop')).not.toBeInTheDocument()
  })

  it('opens on the menu button and becomes reachable again', () => {
    renderSidebar()
    fireEvent.click(screen.getByTestId('nav-toggle'))

    expect(screen.getByTestId('nav-toggle')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('app-sidebar')).not.toHaveAttribute('inert')
    expect(screen.getByTestId('nav-backdrop')).toBeInTheDocument()
  })

  it('moves focus into the drawer when it opens', () => {
    renderSidebar()
    fireEvent.click(screen.getByTestId('nav-toggle'))
    expect(screen.getByTestId('app-sidebar')).toContainElement(
      document.activeElement as HTMLElement
    )
  })

  it('closes on Escape and returns focus to the menu button', () => {
    renderSidebar()
    fireEvent.click(screen.getByTestId('nav-toggle'))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByTestId('nav-toggle')).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(screen.getByTestId('nav-toggle'))
  })

  it('closes when the backdrop is clicked', () => {
    renderSidebar()
    fireEvent.click(screen.getByTestId('nav-toggle'))
    fireEvent.click(screen.getByTestId('nav-backdrop'))
    expect(screen.getByTestId('nav-toggle')).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on the explicit close button', () => {
    renderSidebar()
    fireEvent.click(screen.getByTestId('nav-toggle'))
    fireEvent.click(screen.getByTestId('nav-close'))
    expect(screen.getByTestId('nav-toggle')).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes when a nav link is followed, so the drawer does not cover the page it opened', () => {
    renderSidebar()
    fireEvent.click(screen.getByTestId('nav-toggle'))
    expect(screen.getByTestId('nav-toggle')).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(screen.getByTestId('nav-link-applicants'))

    expect(screen.getByTestId('nav-toggle')).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps Tab inside the drawer while it is open', () => {
    renderSidebar()
    fireEvent.click(screen.getByTestId('nav-toggle'))

    const focusable = Array.from(
      screen.getByTestId('app-sidebar').querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('locks page scroll only while open', () => {
    renderSidebar()
    expect(document.body.style.overflow).not.toBe('hidden')

    fireEvent.click(screen.getByTestId('nav-toggle'))
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('AppSidebar — desktop', () => {
  beforeEach(() => {
    setViewport(true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is never hidden from the keyboard, drawer state notwithstanding', () => {
    renderSidebar()
    expect(screen.getByTestId('app-sidebar')).not.toHaveAttribute('inert')
  })

  it('renders no backdrop, because the rail is not an overlay', () => {
    renderSidebar()
    expect(screen.queryByTestId('nav-backdrop')).not.toBeInTheDocument()
  })
})
