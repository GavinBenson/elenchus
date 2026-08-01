import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Select({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none',
        className
      )}
    />
  )
}
