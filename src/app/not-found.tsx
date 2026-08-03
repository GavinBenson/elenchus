import Link from 'next/link'

/**
 * The top-level 404, outside the authenticated shell — an unmatched URL from a
 * logged-out visitor. Deliberately standalone: rendering the sidebar here would
 * imply a session that may not exist.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="max-w-sm text-center">
        <p className="text-sm font-semibold tracking-tight text-ink">Elenchus</p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          That address does not match anything in this app.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink"
        >
          Go to sign in
        </Link>
      </div>
    </main>
  )
}
