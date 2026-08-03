'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * Covers this segment and the posting detail beneath it. Both fail the same
 * way — the database is unreachable — and both recover the same way.
 */
export default function JobPostingsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div>
      <PageHeader title="Job postings" />
      <Card data-testid="error-state" className="border-stage-rejected/40">
        <p className="text-sm font-semibold text-ink">Could not load job postings</p>
        <p className="mt-1 text-xs text-ink-muted">
          This is usually temporary — try again.
        </p>
        {/* Only the digest: the message itself may carry server detail. */}
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
