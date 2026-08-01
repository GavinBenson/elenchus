import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'

/**
 * Composable rather than config-driven: callers write their own <thead> and
 * <tbody> so they control where data-testid lands. A list's row container
 * carries the list's test id, which is what row-count assertions target.
 */
export function Table({
  className = '',
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      {...props}
      className={`w-full border-collapse text-sm text-ink ${className}`}
    />
  )
}

export function Th({
  className = '',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={`border-y border-line px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-muted ${className}`}
    />
  )
}

export function Td({
  className = '',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      className={`border-b border-line px-4 py-3 align-middle ${className}`}
    />
  )
}

export function TableWrapper({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  // Wide tables scroll inside their own container so the page body never
  // scrolls horizontally on narrow viewports.
  return <div {...props} className={`overflow-x-auto ${className}`} />
}
