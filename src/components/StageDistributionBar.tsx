import Link from 'next/link'
import { stageDistribution } from '@/lib/stage-distribution'
import type { Stage } from '@/lib/applicants-query'
import { cn } from '@/lib/cn'

const SEGMENT_CLASSES: Record<Stage, string> = {
  applied: 'bg-stage-applied',
  interview: 'bg-stage-interview',
  offer: 'bg-stage-offer',
  hired: 'bg-stage-hired',
  rejected: 'bg-stage-rejected',
}

const LABELS: Record<Stage, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

/**
 * Where every candidate currently sits, as one bar. Segments link into the
 * applicants list filtered to that stage.
 */
export function StageDistributionBar({ counts }: { counts: Record<Stage, number> }) {
  const segments = stageDistribution(counts)

  if (segments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-muted">
        No candidates in the pipeline yet
      </p>
    )
  }

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {segments.map((segment) => (
          <Link
            key={segment.stage}
            href={`/applicants?stage=${segment.stage}`}
            style={{ width: `${segment.percent}%` }}
            // The bar is decorative on its own; the readable version is the
            // legend below, so each segment carries its own accessible name.
            aria-label={`${LABELS[segment.stage]}: ${segment.count} candidates`}
            className={cn('block h-full', SEGMENT_CLASSES[segment.stage])}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((segment) => (
          <Link
            key={segment.stage}
            href={`/applicants?stage=${segment.stage}`}
            className="flex items-center gap-1.5 text-xs text-ink-muted underline-offset-2 hover:underline"
          >
            <span
              aria-hidden="true"
              className={cn('h-2 w-2 rounded-full', SEGMENT_CLASSES[segment.stage])}
            />
            {LABELS[segment.stage]}
            <span className="font-semibold tabular-nums text-ink">{segment.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
