import { db } from '@/lib/db'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { StageDistributionBar } from '@/components/StageDistributionBar'
import { OFFER_AGING_DAYS, isAgingOffer } from '@/lib/applicants-query'
import { countsByStage } from '@/lib/posting-pipeline'
import { isTerminated } from '@/lib/employees'

export async function AdminDashboard() {
  const [employees, postings, applicants] = await Promise.all([
    db.employee.findMany({ select: { status: true } }),
    db.jobPosting.findMany({ select: { status: true } }),
    db.applicant.findMany({ select: { stage: true, stageChangedAt: true } }),
  ])

  const now = new Date()
  const counts = countsByStage(applicants)
  const openRoles = postings.filter((posting) => posting.status === 'open').length
  const activeStaff = employees.filter((employee) => !isTerminated(employee)).length
  const activeCandidates = counts.applied + counts.interview + counts.offer
  const agingOffers = applicants.filter((applicant) => isAgingOffer(applicant, now)).length

  return (
    <div data-testid="dashboard-admin">
      <PageHeader title="Org-wide stats" subtitle="Everything, across every team" />

      <div className="grid grid-cols-2 gap-3 pb-4 lg:grid-cols-3">
        {/* Value is the total, not the open count: stat-posting-count has meant
            "how many job postings exist" since Epic 1, and quietly repointing it
            at a subset would change what the assertion measures. Open roles are
            the hint. */}
        <StatTile
          data-testid="stat-tile-postings"
          label="Job postings"
          value={<span data-testid="stat-posting-count">{postings.length}</span>}
          hint={`${openRoles} open`}
          href="/job-postings"
        />
        <StatTile
          data-testid="stat-tile-active-candidates"
          label="Active candidates"
          value={activeCandidates}
          hint="Not yet hired or rejected"
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
          hint={
            agingOffers > 0
              ? `${agingOffers} past ${OFFER_AGING_DAYS} days`
              : 'None aging'
          }
          tone={agingOffers > 0 ? 'warn' : 'default'}
          href="/applicants?stage=offer"
        />
        <StatTile
          data-testid="stat-tile-employees"
          label="Employees"
          value={<span data-testid="stat-employee-count">{employees.length}</span>}
          hint={`${activeStaff} active`}
          href="/employees"
        />
        <StatTile
          data-testid="stat-tile-applicants"
          label="Applicants"
          value={<span data-testid="stat-applicant-count">{applicants.length}</span>}
          hint="All time"
          href="/applicants"
        />
      </div>

      <Card>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Pipeline distribution
        </p>
        <div className="mt-3">
          <StageDistributionBar counts={counts} />
        </div>
      </Card>
    </div>
  )
}
