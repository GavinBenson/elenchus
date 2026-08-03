import Link from 'next/link'
import { db } from '@/lib/db'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { StageDistributionBar } from '@/components/StageDistributionBar'
import { OFFER_AGING_DAYS, daysInStage, isAgingOffer, sortForReview } from '@/lib/applicants-query'
import { activeCount, countsByStage } from '@/lib/posting-pipeline'

export async function RecruiterDashboard() {
  // No employee data is read here. A recruiter does not hold
  // view_all_employees, and the dashboard must not show through a gate the
  // rest of the app enforces.
  const [postings, applicants] = await Promise.all([
    db.jobPosting.findMany({
      where: { status: 'open' },
      include: { applicants: { select: { stage: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.applicant.findMany({
      select: { id: true, name: true, stage: true, stageChangedAt: true },
    }),
  ])

  const now = new Date()
  const counts = countsByStage(applicants)
  const agingOffers = sortForReview(
    applicants.filter((applicant) => isAgingOffer(applicant, now)),
    now
  )

  return (
    <div data-testid="dashboard-recruiter">
      <PageHeader title="Your pipeline" subtitle="Open roles and where candidates stand" />

      <div className="grid grid-cols-2 gap-3 pb-4 lg:grid-cols-4">
        <StatTile
          data-testid="stat-tile-open-roles"
          label="Open roles"
          value={postings.length}
          href="/job-postings"
        />
        <StatTile
          data-testid="stat-tile-active-candidates"
          label="Active candidates"
          value={counts.applied + counts.interview + counts.offer}
          href="/applicants"
        />
        <StatTile
          data-testid="stat-tile-interview"
          label="In interview"
          value={counts.interview}
          href="/applicants?stage=interview"
        />
        <StatTile
          data-testid="stat-tile-offers"
          label="Offers out"
          value={counts.offer}
          hint={agingOffers.length > 0 ? `${agingOffers.length} aging` : 'None aging'}
          tone={agingOffers.length > 0 ? 'warn' : 'default'}
          href="/applicants?stage=offer"
        />
      </div>

      {agingOffers.length > 0 ? (
        <Card className="mb-4 border-warn/50 bg-warn-bg">
          <p className="text-sm font-semibold text-warn">
            {agingOffers.length} offer{agingOffers.length === 1 ? '' : 's'} outstanding past{' '}
            {OFFER_AGING_DAYS} days
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {agingOffers.map((applicant) => (
              <Link
                key={applicant.id}
                href={`/applicants/${applicant.id}`}
                className="flex items-center gap-2.5 rounded-lg border border-line bg-panel p-2.5 transition-colors hover:border-accent"
              >
                <Avatar name={applicant.name} />
                <span className="truncate text-sm font-medium text-ink">{applicant.name}</span>
                <span className="ml-auto shrink-0 text-xs font-semibold text-warn">
                  {daysInStage(applicant.stageChangedAt, now)}d
                </span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Pipeline distribution
        </p>
        <div className="mt-3">
          <StageDistributionBar counts={counts} />
        </div>
      </Card>

      <Card>
        <p className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Open postings
        </p>
        {postings.length === 0 ? (
          <EmptyState
            data-testid="empty-state"
            title="No open roles"
            message="Postings you open will appear here with their pipeline."
          />
        ) : (
          <div data-testid="recruiter-postings-list" className="flex flex-col gap-2">
            {postings.map((posting) => (
              <Link
                key={posting.id}
                href={`/job-postings/${posting.id}`}
                className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3 transition-colors hover:border-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {posting.title}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {posting.department}
                  </span>
                </span>
                <span className="ml-auto shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-ink">
                    {activeCount(posting.applicants)}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wider text-ink-muted">
                    in pipeline
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
