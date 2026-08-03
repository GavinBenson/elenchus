import Link from 'next/link'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, type Stage } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table, TableWrapper, Td, Th } from '@/components/ui/Table'
import {
  OFFER_AGING_DAYS,
  applicantWhere,
  daysInStage,
  isAgingOffer,
  parseApplicantFilters,
  sortForReview,
} from '@/lib/applicants-query'
import { ApplicantFilters } from './ApplicantFilters'

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSession()

  const filters = parseApplicantFilters(await searchParams)

  const [rows, postings] = await Promise.all([
    db.applicant.findMany({
      where: applicantWhere(filters),
      include: { jobPosting: true },
    }),
    db.jobPosting.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } }),
  ])

  // One clock reading for the whole render, so two rows evaluated a
  // millisecond apart cannot disagree about what day it is.
  const now = new Date()
  const applicants = sortForReview(rows, now)
  const agingCount = applicants.filter((applicant) => isAgingOffer(applicant, now)).length
  const isFiltered = Boolean(filters.query || filters.stage || filters.postingId)

  return (
    <div>
      <PageHeader
        title="Applicants"
        subtitle={
          agingCount > 0
            ? `${applicants.length} shown · ${agingCount} offer${agingCount === 1 ? '' : 's'} aging past ${OFFER_AGING_DAYS} days`
            : `${applicants.length} shown`
        }
      />

      <ApplicantFilters filters={filters} postings={postings} />

      {applicants.length === 0 ? (
        <EmptyState
          data-testid="empty-state"
          title={isFiltered ? 'No applicants match these filters' : 'No applicants yet'}
          message={
            isFiltered
              ? 'Try a different search term, or clear the stage and role filters.'
              : 'Applicants appear here as soon as someone applies to an open role.'
          }
        />
      ) : (
        <Card className="p-0">
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Candidate</Th>
                  <Th>Role</Th>
                  <Th>Stage</Th>
                  <Th className="text-right">Days in stage</Th>
                </tr>
              </thead>
              <tbody data-testid="applicants-list">
                {applicants.map((applicant) => {
                  const aging = isAgingOffer(applicant, now)
                  const days = daysInStage(applicant.stageChangedAt, now)

                  return (
                    <tr
                      key={applicant.id}
                      data-testid={`applicant-row-${applicant.id}`}
                      className={aging ? 'bg-warn-bg' : 'hover:bg-rail/60'}
                    >
                      <Td>
                        <Link
                          href={`/applicants/${applicant.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar name={applicant.name} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {applicant.name}
                            </span>
                            <span className="block truncate text-xs text-ink-muted">
                              {applicant.email}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td className="text-ink-muted">{applicant.jobPosting.title}</Td>
                      <Td>
                        <Badge stage={applicant.stage as Stage} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        {aging ? (
                          <span
                            className="font-semibold text-warn"
                            title={`Offer outstanding longer than ${OFFER_AGING_DAYS} days`}
                          >
                            {days}d · aging
                          </span>
                        ) : (
                          <span className="text-ink-muted">{days}d</span>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </TableWrapper>
        </Card>
      )}
    </div>
  )
}
