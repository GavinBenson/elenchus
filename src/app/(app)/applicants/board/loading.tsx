import { PageHeader } from '@/components/ui/PageHeader'
import { STAGES } from '@/lib/applicants-query'

/**
 * Column-shaped rather than reusing the list's table skeleton: the parent
 * segment's loading.tsx would otherwise apply here and flash a table layout
 * before a board appears.
 */
export default function BoardLoading() {
  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Loading…" />
      <div data-testid="loading-skeleton" className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="flex min-w-[240px] flex-1 flex-col gap-2 rounded-xl border border-line bg-rail/50 p-2"
          >
            <div className="h-5 w-20 animate-pulse rounded-full bg-rail" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-rail" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
