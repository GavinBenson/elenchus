import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const VARIANTS = {
  primary: 'bg-accent text-accent-contrast border-accent font-semibold',
  secondary: 'bg-panel text-ink border-line',
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS
}) {
  return (
    <button
      {...props}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className
      )}
    />
  )
}
