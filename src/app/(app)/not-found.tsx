import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * Reached whenever a detail page calls notFound() — a stale bookmark, a
 * deleted record, a mistyped id. Without this, Next's unstyled default renders
 * inside the app shell, which is the one thing the consistency sweep exists to
 * catch.
 */
export default function AppNotFound() {
  return (
    <div>
      <PageHeader title="Not found" />
      <Card data-testid="not-found-state">
        <p className="text-sm font-semibold text-ink">That record does not exist</p>
        <p className="mt-1 text-xs text-ink-muted">
          It may have been deleted, or the link may be wrong. Your navigation is still on the
          left.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink"
        >
          Back to dashboard
        </Link>
      </Card>
    </div>
  )
}
