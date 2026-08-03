import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusPill } from '@/components/ui/StatusPill'
import { STAGES, daysInStage, isAgingOffer, sortForReview } from '@/lib/applicants-query'
import { activeCount, countsByStage } from '@/lib/posting-pipeline'
import { cn } from '@/lib/cn'

export default async function JobPostingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSession()

  const { id } = await params
  const posting = await db.jobPosting.findUnique({
    where: { id },
    include: { applicants: true },
  })
  if (!posting) notFound()

  const now = new Date()
  const counts = countsByStage(posting.applicants)
  const active = activeCount(posting.applicants)

  return (
    <div data-testid="job-posting-detail">
      <PageHeader
        title={posting.title}
        subtitle={`${posting.department} · ${posting.applicants.length} applicants · ${active} still in pipeline`}
        actions={
          <Link
            href="/job-postings"
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink"
          >
            All postings
          </Link>
        }
      />

      <div className="pb-4">
        <StatusPill status={posting.status} />
      </div>

      {/* Counts link through to the applicants list filtered to this posting
          and stage, so a count is a way in rather than a dead number. */}
      <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAGES.map((stage) => (
          <Link
            key={stage}
            href={`/applicants?posting=${posting.id}&stage=${stage}`}
            className="rounded-xl border border-line bg-panel p-3 transition-colors hover:border-accent"
          >
            <Badge stage={stage} />
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{counts[stage]}</p>
          </Link>
        ))}
      </div>

      {posting.applicants.length === 0 ? (
        <Card data-testid="applicant-pipeline">
          <p className="py-8 text-center text-sm text-ink-muted">
            No one has applied to this role yet.
          </p>
        </Card>
      ) : (
        <div data-testid="applicant-pipeline" className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const inStage = sortForReview(
              posting.applicants.filter((applicant) => applicant.stage === stage),
              now
            )

            return (
              <div
                key={stage}
                data-testid={`pipeline-column-${stage}`}
                className="flex min-w-[200px] flex-1 flex-col gap-2 rounded-xl border border-line bg-rail/50 p-2"
              >
                <div className="flex items-center justify-between px-1 pb-1">
                  <Badge stage={stage} />
                  <span className="text-xs tabular-nums text-ink-muted">{inStage.length}</span>
                </div>

                {inStage.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-2 py-5 text-center text-xs text-ink-muted">
                    Nobody here
                  </p>
                ) : (
                  inStage.map((applicant) => {
                    const aging = isAgingOffer(applicant, now)

                    return (
                      <Link
                        key={applicant.id}
                        data-testid={`applicant-card-${applicant.id}`}
                        href={`/applicants/${applicant.id}`}
                        className={cn(
                          'rounded-lg border border-line bg-panel p-2.5 transition-colors hover:border-accent',
                          aging && 'border-warn/50 bg-warn-bg'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Avatar name={applicant.name} />
                          <span className="min-w-0 truncate text-sm font-medium text-ink">
                            {applicant.name}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'mt-1.5 block text-xs',
                            aging ? 'font-semibold text-warn' : 'text-ink-muted'
                          )}
                        >
                          {daysInStage(applicant.stageChangedAt, now)}d in stage
                        </span>
                      </Link>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
