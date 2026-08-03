import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

export default function DashboardLoading() {
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Loading…" />
      <div data-testid="loading-skeleton" className="grid grid-cols-2 gap-3 pb-4 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-panel p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-rail" />
            <div className="mt-2 h-7 w-12 animate-pulse rounded bg-rail" />
          </div>
        ))}
      </div>
      <Card>
        <div className="h-3 w-32 animate-pulse rounded bg-rail" />
        <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-rail" />
      </Card>
    </div>
  )
}
