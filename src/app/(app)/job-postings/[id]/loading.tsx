import { PageHeader } from '@/components/ui/PageHeader'
import { STAGES } from '@/lib/applicants-query'

/**
 * Column-shaped rather than the list's table skeleton, which the parent
 * segment would otherwise supply.
 */
export default function JobPostingDetailLoading() {
  return (
    <div>
      <PageHeader title="Loading…" />
      <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAGES.map((stage) => (
          <div key={stage} className="rounded-xl border border-line bg-panel p-3">
            <div className="h-5 w-16 animate-pulse rounded-full bg-rail" />
            <div className="mt-2 h-7 w-8 animate-pulse rounded bg-rail" />
          </div>
        ))}
      </div>
      <div data-testid="loading-skeleton" className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="flex min-w-[200px] flex-1 flex-col gap-2 rounded-xl border border-line bg-rail/50 p-2"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-rail" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
