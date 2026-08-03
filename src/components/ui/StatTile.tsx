import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A headline number with a label. Renders as a link when `href` is given, so a
 * count is a way into the filtered list rather than a dead number — the same
 * rule the job-posting stage tiles follow.
 *
 * `value` is a node rather than a number so a caller can put a test id on the
 * number itself — three of these carry ids the Playwright suite has depended on
 * since Epic 1. Passing the id as a prop instead would hide it from
 * testid-contract.test.ts, which scans source for the literal attribute.
 */
export function StatTile({
  label,
  value,
  hint,
  href,
  tone = 'default',
  className = '',
  ...props
}: {
  label: string
  value: ReactNode
  hint?: string
  href?: string
  tone?: 'default' | 'warn'
} & React.HTMLAttributes<HTMLDivElement>) {
  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          tone === 'warn' ? 'text-warn' : 'text-ink'
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </>
  )

  const shell = cn(
    'block rounded-xl border bg-panel p-4',
    tone === 'warn' ? 'border-warn/50' : 'border-line',
    href && 'transition-colors hover:border-accent',
    className
  )

  if (href) {
    return (
      <Link href={href} className={shell} {...(props as React.HTMLAttributes<HTMLAnchorElement>)}>
        {body}
      </Link>
    )
  }

  return (
    <div className={shell} {...props}>
      {body}
    </div>
  )
}
