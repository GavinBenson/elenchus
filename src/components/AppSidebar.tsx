'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { NavItem } from '@/lib/nav'
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

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
  const [theme, setTheme] = useState<Theme>('light')
  const [signingOut, setSigningOut] = useState(false)

  // The pre-paint script in the root layout already set the class; read it
  // back rather than recomputing, so the toggle starts in the right position.
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  function toggleTheme() {
    // Read the DOM directly rather than trusting `theme` state: a click that
    // lands before the mount effect above has committed would otherwise
    // compute the next theme from the wrong ('light') base and desync state
    // from the actual DOM class.
    const current: Theme = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
    const next: Theme = current === 'dark' ? 'light' : 'dark'
    setTheme(next)
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

  return (
    <nav
      data-testid="app-sidebar"
      className="flex w-56 shrink-0 flex-col border-r border-line bg-rail p-3"
    >
      <div className="px-2 pb-4">
        <p className="text-sm font-semibold tracking-tight text-ink">Elenchus</p>
        <p data-testid="user-menu" className="mt-0.5 text-[11px] text-ink-muted">
          {userEmail} · {roleName}
        </p>
      </div>

      <div className="flex-1 space-y-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              aria-current={active ? 'page' : undefined}
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
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-muted hover:text-ink"
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
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
  )
}
