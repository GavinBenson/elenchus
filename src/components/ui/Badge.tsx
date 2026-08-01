import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type Stage = 'applied' | 'interview' | 'offer' | 'hired' | 'rejected'

const LABELS: Record<Stage, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

// Written out rather than interpolated: Tailwind scans source for complete
// class strings, so `bg-stage-${stage}-bg` would never be generated.
const CLASSES: Record<Stage, string> = {
  applied: 'bg-stage-applied-bg text-stage-applied',
  interview: 'bg-stage-interview-bg text-stage-interview',
  offer: 'bg-stage-offer-bg text-stage-offer',
  hired: 'bg-stage-hired-bg text-stage-hired',
  rejected: 'bg-stage-rejected-bg text-stage-rejected',
}

export function Badge({
  stage,
  className = '',
  ...props
}: {
  stage: Stage
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold',
        CLASSES[stage],
        className
      )}
    >
      {LABELS[stage]}
    </span>
  )
}
