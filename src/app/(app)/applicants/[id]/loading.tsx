import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * Two-column shaped rather than the list's table skeleton, which the parent
 * segment would otherwise supply — a table flashing before a detail page
 * appears reads as the wrong screen loading.
 */
export default function ApplicantDetailLoading() {
  return (
    <div>
      <PageHeader title="Loading…" />
      <div
        data-testid="loading-skeleton"
        className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-full bg-rail" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-rail" />
                <div className="h-3 w-56 animate-pulse rounded bg-rail" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-rail" />
              ))}
            </div>
          </Card>
          <Card>
            <div className="space-y-3">
              <div className="h-3 w-24 animate-pulse rounded bg-rail" />
              <div className="h-10 w-48 animate-pulse rounded bg-rail" />
              <div className="h-10 w-48 animate-pulse rounded bg-rail" />
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <div className="h-3 w-16 animate-pulse rounded bg-rail" />
              <div className="mt-2 h-4 w-32 animate-pulse rounded bg-rail" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
