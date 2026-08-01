import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  title,
  message,
  className = '',
  ...props
}: {
  title: string
  message?: string
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-xl border border-dashed border-line bg-panel px-6 py-12 text-center',
        className
      )}
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message ? <p className="mt-1 text-xs text-ink-muted">{message}</p> : null}
    </div>
  )
}
