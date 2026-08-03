'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

export default function ApplicantDetailError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div>
      <PageHeader title="Applicant" />
      <Card data-testid="error-state" className="border-stage-rejected/40">
        <p className="text-sm font-semibold text-ink">Could not load this applicant</p>
        <p className="mt-1 text-xs text-ink-muted">
          The record failed to load. This is usually temporary — try again.
        </p>
        {/* Only the digest: the message itself may carry server detail. */}
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-ink-muted">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={() => unstable_retry()}>
            Try again
          </Button>
          <Link
            href="/applicants"
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink"
          >
            Back to list
          </Link>
        </div>
      </Card>
    </div>
  )
}
