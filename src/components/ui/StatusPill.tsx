import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/**
 * Open/closed state for a job posting. Separate from `Badge`, which maps the
 * five pipeline stages: a posting's status is a different axis, and folding it
 * into the stage variants would make "closed" look like a sixth stage.
 */
const TONES = {
  open: 'bg-stage-hired-bg text-stage-hired',
  closed: 'bg-stage-applied-bg text-ink-muted',
}

export function StatusPill({
  status,
  className = '',
  ...props
}: {
  status: string
} & HTMLAttributes<HTMLSpanElement>) {
  const tone = status === 'open' ? TONES.open : TONES.closed

  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        tone,
        className
      )}
    >
      {/* A dot as well as colour, so open and closed are still distinguishable
          without relying on hue alone. */}
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'open' ? 'bg-stage-hired' : 'bg-ink-muted'
        )}
      />
      {status}
    </span>
  )
}
