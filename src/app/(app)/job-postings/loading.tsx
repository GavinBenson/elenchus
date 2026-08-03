import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'

export default function JobPostingsLoading() {
  return (
    <div>
      <PageHeader title="Job postings" subtitle="Loading…" />
      <Card className="p-0">
        <Skeleton data-testid="loading-skeleton" rows={6} className="p-4" />
      </Card>
    </div>
  )
}
