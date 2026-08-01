export function Skeleton({
  rows = 5,
  'data-testid': testId,
}: {
  rows?: number
  'data-testid'?: string
}) {
  return (
    <div data-testid={testId} className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-rail" />
      ))}
    </div>
  )
}
