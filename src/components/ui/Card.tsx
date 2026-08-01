import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Card({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('rounded-xl border border-line bg-panel p-4', className)}
    />
  )
}
