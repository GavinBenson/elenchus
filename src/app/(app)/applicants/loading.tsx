import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Reachable on first load and on any filter change slow enough to suspend.
 * Mirrors the real layout's header/filter/table rhythm so the page does not
 * visibly jump when the data arrives.
 */
export default function ApplicantsLoading() {
  return (
    <div>
      <PageHeader title="Applicants" subtitle="Loading…" />
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <div className="h-8 w-full animate-pulse rounded-lg bg-rail sm:w-64" />
        <div className="h-8 w-32 animate-pulse rounded-lg bg-rail" />
        <div className="h-8 w-32 animate-pulse rounded-lg bg-rail" />
      </div>
      <Card className="p-0">
        <Skeleton data-testid="loading-skeleton" rows={8} className="p-4" />
      </Card>
    </div>
  )
}
