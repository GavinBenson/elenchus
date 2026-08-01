import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Skeleton({
  rows = 5,
  className = '',
  ...props
}: {
  rows?: number
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-rail" />
      ))}
    </div>
  )
}
