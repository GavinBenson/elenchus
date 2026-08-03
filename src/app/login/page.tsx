'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEMO_PASSWORD, DEMO_USERS } from '@/lib/demo-users'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Holds which control is mid-flight: the form, or a specific demo role. One
  // piece of state rather than several booleans, so nothing can be pending
  // twice at once and every control disables together.
  const [pending, setPending] = useState<string | null>(null)

  async function signIn(credentials: { email: string; password: string }, source: string) {
    if (pending) return
    setError(null)
    setPending(source)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        // The previous version read `body.error.message` unguarded, which threw
        // a second, uglier error whenever the response was not that shape.
        const body = await response.json().catch(() => null)
        setError(body?.error?.message ?? `Could not sign in (${response.status})`)
        setPending(null)
        return
      }

      // Pending stays set through the navigation: clearing it here would
      // re-enable every control for the moment before the route changes.
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setPending(null)
    }
  }

  return (
    <main className="flex min-h-screen bg-surface">
      {/* Brand panel. Hidden below lg because it is context, not content — the
          form must never be pushed off a small screen to make room for it. */}
      <section className="hidden w-1/2 flex-col justify-between bg-rail p-10 lg:flex">
        <div>
          <p className="text-sm font-semibold tracking-tight text-ink">Elenchus</p>
          <p className="mt-1 text-xs text-ink-muted">Applicant tracking, demonstrated</p>
        </div>

        <div className="max-w-md">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-ink">
            A hiring pipeline you can actually click through.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Six open roles, forty-six candidates across five stages, and a
            permission model that changes what each role sees. Sign in as any of
            them.
          </p>
        </div>

        <p className="text-xs text-ink-muted">Seeded demo data. Nothing here is a real person.</p>
      </section>

      <section className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Use a demo account, or enter credentials.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.role}
                type="button"
                data-testid={`demo-login-${user.role}`}
                disabled={pending !== null}
                onClick={() => signIn({ email: user.email, password: DEMO_PASSWORD }, user.role)}
                className="rounded-lg border border-line bg-panel p-3 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold capitalize text-ink">{user.role}</span>
                  {pending === user.role ? (
                    <span className="text-xs text-ink-muted">Signing in…</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">{user.blurb}</span>
              </button>
            ))}
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10px] uppercase tracking-wider text-ink-muted">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form
            data-testid="login-form"
            onSubmit={(event) => {
              event.preventDefault()
              signIn({ email, password }, 'form')
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Email
              </span>
              <Input
                data-testid="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@elenchus.test"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Password
              </span>
              <Input
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p
                data-testid="login-error"
                role="alert"
                className="rounded-lg border border-stage-rejected/40 bg-stage-rejected-bg px-3 py-2 text-sm text-stage-rejected"
              >
                {error}
              </p>
            )}

            <Button
              data-testid="login-submit"
              type="submit"
              variant="primary"
              disabled={pending !== null}
              className="mt-1"
            >
              {pending === 'form' ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-xs text-ink-muted lg:hidden">
            Seeded demo data. Nothing here is a real person.
          </p>
        </div>
      </section>
    </main>
  )
}
