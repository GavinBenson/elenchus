'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { STAGES, type Stage } from '@/lib/applicants-query'

const LABELS: Record<Stage, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

/**
 * Behaviour is unchanged from PBI 1.10 — same request, same test ids, same
 * disabled and error handling. Only the styling moved onto the design system,
 * which is what the 6.8 acceptance criteria ask for. The stage list now comes
 * from the shared constant rather than a local copy of the same five strings.
 */
export default function StageControl({
  applicantId,
  currentStage,
}: {
  applicantId: string
  currentStage: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Stage | null>(null)

  async function handleClick(stage: Stage) {
    setError(null)
    setPending(stage)
    try {
      const response = await fetch(`/api/applicants/${applicantId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error?.message ?? `Failed to update stage (${response.status})`)
        return
      }
      router.refresh()
    } catch {
      setError('Failed to update stage')
    } finally {
      setPending(null)
    }
  }

  return (
    <div>
      <p className="pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        Move to stage
      </p>
      <div className="flex flex-wrap gap-2">
        {STAGES.map((stage) => (
          <Button
            key={stage}
            type="button"
            variant={stage === currentStage ? 'primary' : 'secondary'}
            data-testid={`stage-button-${stage}`}
            disabled={stage === currentStage || pending !== null}
            onClick={() => handleClick(stage)}
          >
            {pending === stage ? 'Saving…' : LABELS[stage]}
          </Button>
        ))}
      </div>
      {error && (
        <p
          data-testid="stage-error"
          role="alert"
          className="mt-2 rounded-lg border border-stage-rejected/40 bg-stage-rejected-bg px-3 py-2 text-sm text-stage-rejected"
        >
          {error}
        </p>
      )}
    </div>
  )
}
