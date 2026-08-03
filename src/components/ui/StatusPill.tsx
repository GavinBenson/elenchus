import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/**
 * Open/closed state for a job posting. Separate from `Badge`, which maps the
 * five pipeline stages: a posting's status is a different axis, and folding it
 * into the stage variants would make "closed" look like a sixth stage.
 */
const TONES = {
  positive: 'bg-stage-hired-bg text-stage-hired',
  neutral: 'bg-stage-applied-bg text-ink-muted',
}

/**
 * `positive` is the caller's call because the word that means "live" differs
 * per resource — a posting is `open`, an employee is `active` — and hardcoding
 * one of them here would silently render the other as inactive.
 */
export function StatusPill({
  status,
  positive = status === 'open',
  className = '',
  ...props
}: {
  status: string
  positive?: boolean
} & HTMLAttributes<HTMLSpanElement>) {
  const tone = positive ? TONES.positive : TONES.neutral

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
        className={cn('h-1.5 w-1.5 rounded-full', positive ? 'bg-stage-hired' : 'bg-ink-muted')}
      />
      {status}
    </span>
  )
}
