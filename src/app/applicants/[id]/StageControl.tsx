'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STAGES = ['applied', 'interview', 'offer', 'hired', 'rejected'] as const
type Stage = (typeof STAGES)[number]

export default function StageControl({ applicantId, currentStage }: { applicantId: string; currentStage: string }) {
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
      <div className="flex gap-2">
        {STAGES.map((stage) => (
          <button
            key={stage}
            type="button"
            data-testid={`stage-button-${stage}`}
            disabled={stage === currentStage || pending !== null}
            onClick={() => handleClick(stage)}
            className={
              stage === currentStage
                ? 'bg-black text-white p-2 rounded'
                : 'bg-gray-200 p-2 rounded'
            }
          >
            {stage}
          </button>
        ))}
      </div>
      {error && (
        <p data-testid="stage-error" className="text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  )
}
