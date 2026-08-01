export function EmptyState({
  title,
  message,
  'data-testid': testId,
}: {
  title: string
  message?: string
  'data-testid'?: string
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-dashed border-line bg-panel px-6 py-12 text-center"
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message ? <p className="mt-1 text-xs text-ink-muted">{message}</p> : null}
    </div>
  )
}
