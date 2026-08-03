import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminRolesLoading() {
  return (
    <div>
      <PageHeader title="Roles & permissions" subtitle="Loading…" />
      <Card className="p-0">
        <Skeleton data-testid="loading-skeleton" rows={5} className="p-4" />
      </Card>
    </div>
  )
}
