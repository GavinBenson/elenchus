'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * Reachable when the applicants query fails — a dropped database connection
 * being the realistic case. `unstable_retry` (Next 16.2's replacement for
 * `reset`) re-fetches the segment rather than only clearing the error state,
 * which is what a transient database failure actually needs.
 */
export default function ApplicantsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div>
      <PageHeader title="Applicants" />
      <Card data-testid="error-state" className="border-stage-rejected/40">
        <p className="text-sm font-semibold text-ink">Could not load applicants</p>
        <p className="mt-1 text-xs text-ink-muted">
          The list failed to load. This is usually temporary — try again.
        </p>
        {/* The digest is the only safe identifier to surface: the message
            itself may carry server detail. */}
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-ink-muted">Reference: {error.digest}</p>
        ) : null}
        <Button variant="primary" className="mt-4" onClick={() => unstable_retry()}>
          Try again
        </Button>
      </Card>
    </div>
  )
}
