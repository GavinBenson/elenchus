import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
  ...props
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>) {
  return (
    <div
      {...props}
      className={cn('flex items-start justify-between gap-4 pb-4', className)}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? (
          <p data-testid="page-subtitle" className="mt-1 text-xs text-ink-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
