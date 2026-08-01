import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none',
        className
      )}
    />
  )
}
