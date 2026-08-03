import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, type Stage } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { buildTimeline } from '@/lib/applicant-timeline'
import { OFFER_AGING_DAYS } from '@/lib/applicants-query'
import { cn } from '@/lib/cn'
import StageControl from './StageControl'

// Fixed locale and UTC: the seed anchors its dates to midnight UTC, so
// formatting in the server's local zone would show yesterday for anyone west
// of Greenwich.
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{children}</p>
  )
}

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSession()

  const { id } = await params
  const applicant = await db.applicant.findUnique({
    where: { id },
    include: { jobPosting: true },
  })
  if (!applicant) notFound()

  const now = new Date()
  const timeline = buildTimeline(applicant, now)

  return (
    <div data-testid="applicant-detail">
      <PageHeader
        title={applicant.name}
        actions={
          <Link
            href="/applicants"
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink"
          >
            Back to list
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-start gap-3">
              <Avatar name={applicant.name} className="h-11 w-11 text-sm" />
              <div className="min-w-0">
                <p data-testid="applicant-name" className="text-base font-semibold text-ink">
                  {applicant.name}
                </p>
                <a
                  data-testid="applicant-email"
                  href={`mailto:${applicant.email}`}
                  className="block truncate text-sm text-accent underline-offset-2 hover:underline"
                >
                  {applicant.email}
                </a>
              </div>
              <div className="ml-auto">
                <Badge data-testid="applicant-stage" stage={applicant.stage as Stage} />
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <StageControl applicantId={applicant.id} currentStage={applicant.stage} />
            </div>
          </Card>

          <Card>
            <Label>Stage history</Label>
            <ol className="mt-3 flex flex-col gap-4">
              {timeline.map((entry, index) => {
                const isLast = index === timeline.length - 1
                const aging = entry.kind === 'current' && entry.aging

                return (
                  <li key={entry.kind} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'mt-1 h-2.5 w-2.5 rounded-full',
                          aging ? 'bg-warn' : entry.terminal ? 'bg-ink-muted' : 'bg-accent'
                        )}
                      />
                      {!isLast ? <span className="mt-1 w-px flex-1 bg-line" /> : null}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium text-ink">
                        {entry.kind === 'applied'
                          ? 'Applied'
                          : `Moved to ${STAGE_LABELS[entry.stage] ?? entry.stage}`}
                      </p>
                      <p className={cn('mt-0.5 text-xs', aging ? 'text-warn' : 'text-ink-muted')}>
                        {DATE_FORMAT.format(entry.at)} ·{' '}
                        {/* Only the last entry is a stage they are still in.
                            Saying "in this stage" on the Applied row would
                            claim they are still in Applied. */}
                        {isLast && !entry.terminal
                          ? `${entry.days}d in this stage`
                          : `${entry.days}d ago`}
                        {aging ? ` · outstanding past ${OFFER_AGING_DAYS} days` : ''}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
            {/* Stated rather than implied: the record stores two timestamps and
                no per-transition history, so anything between these points
                would be invented. */}
            <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
              Only the application and the current stage are recorded. Intermediate
              transitions are not stored.
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <Label>Role</Label>
            <Link
              data-testid="applicant-job-posting"
              href={`/job-postings/${applicant.jobPostingId}`}
              className="mt-1 block text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              {applicant.jobPosting.title}
            </Link>
            <p className="mt-1 text-xs text-ink-muted">
              {applicant.jobPosting.department} · {applicant.jobPosting.status}
            </p>
          </Card>

          <Card>
            <Label>Résumé</Label>
            {applicant.resumeUrl ? (
              <a
                href={applicant.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate text-sm text-accent underline-offset-2 hover:underline"
              >
                View résumé
              </a>
            ) : (
              // Most seeded applicants have no résumé, so this is the common
              // case rather than an edge case, and it gets a real treatment.
              <p className="mt-1 text-sm text-ink-muted">No résumé attached</p>
            )}
          </Card>

          <Card>
            <Label>Applied</Label>
            <p className="mt-1 text-sm text-ink">{DATE_FORMAT.format(applicant.appliedAt)}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
