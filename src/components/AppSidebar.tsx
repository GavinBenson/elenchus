'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { NavItem } from '@/lib/nav'
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme'
import { cn } from '@/lib/cn'

/** Matches Tailwind's `lg`, where the drawer gives way to the static rail. */
const DESKTOP_QUERY = '(min-width: 1024px)'

const FOCUSABLE = 'a[href], button:not([disabled])'

export function AppSidebar({
  items,
  userEmail,
  roleName,
}: {
  items: NavItem[]
  userEmail: string
  roleName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [open, setOpen] = useState(false)
  // Undefined until measured: assuming either width would apply the wrong
  // treatment before the first effect runs.
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined)

  const navRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const sync = () => setIsDesktop(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    // Send focus back where it came from, or it lands on <body> and the next
    // Tab starts from the top of the page.
    toggleRef.current?.focus()
  }, [])

  // Escape closes, and Tab stays inside the drawer while it is open. Without
  // the trap, tabbing walks into the page behind an overlay the user cannot
  // see past.
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(
        navRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  // Move focus into the drawer when it opens, and stop the page behind it
  // scrolling.
  useEffect(() => {
    if (!open) return
    navRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  function toggleTheme() {
    // The DOM class is the single source of truth: the pre-paint script in the
    // root layout sets it before React runs, so there is no React state to keep
    // in sync and nothing that can disagree with what the user is looking at.
    const current: Theme = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
    const next: Theme = current === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for
      // this session, it just will not persist.
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    // Navigate to /login regardless of outcome: if the request failed the
    // session is unusable either way, and there is nothing useful to show
    // the user by staying put.
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Network failure — fall through to navigation below.
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  // Off-screen drawer links stay in the tab order unless they are inert, which
  // would let a keyboard user tab into navigation they cannot see. Only ever
  // applied on mobile, and never before the width is known.
  const hiddenFromKeyboard = isDesktop === false && !open

  return (
    <>
      {/* Mobile chrome. Hidden at lg, where the rail is always visible. */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-rail px-3 lg:hidden">
        <button
          ref={toggleRef}
          type="button"
          data-testid="nav-toggle"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="app-sidebar"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-line bg-panel px-2.5 py-1 text-sm text-ink"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <p className="text-sm font-semibold tracking-tight text-ink">Elenchus</p>
      </div>

      {open ? (
        <div
          data-testid="nav-backdrop"
          onClick={close}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      ) : null}

      <nav
        ref={navRef}
        id="app-sidebar"
        data-testid="app-sidebar"
        inert={hiddenFromKeyboard}
        className={cn(
          // Mobile: a drawer over the content. Desktop: the original static
          // rail, unchanged — same element, same ids, one instance, so no
          // selector can match twice.
          'fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-line bg-rail p-3 transition-transform duration-200',
          'lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-start gap-2 px-2 pb-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-ink">Elenchus</p>
            <p data-testid="user-menu" className="mt-0.5 truncate text-[11px] text-ink-muted">
              {userEmail} · {roleName}
            </p>
          </div>
          <button
            type="button"
            data-testid="nav-close"
            aria-label="Close navigation"
            onClick={close}
            className="ml-auto rounded-lg px-2 py-0.5 text-sm text-ink-muted hover:text-ink lg:hidden"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="flex-1 space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                aria-current={active ? 'page' : undefined}
                // Closed on the click rather than by reacting to the pathname:
                // navigating is the event, and setting state inside an effect
                // keyed on the route causes a cascading render.
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-2.5 py-1.5 text-[13px] ${
                  active
                    ? 'bg-panel font-semibold text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="space-y-0.5 border-t border-line pt-2">
          <button
            type="button"
            data-testid="theme-toggle"
            onClick={toggleTheme}
            className="w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-muted hover:text-ink"
          >
            {/* The label is chosen by CSS, not React state: the current theme is
                unknowable during server rendering, so deriving it from state
                would render the wrong text until hydration. */}
            <span className="dark:hidden">Dark mode</span>
            <span className="hidden dark:inline">Light mode</span>
          </button>
          <button
            type="button"
            data-testid="logout-button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-muted hover:text-ink disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </nav>
    </>
  )
}
