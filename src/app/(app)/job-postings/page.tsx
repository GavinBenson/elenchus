import Link from 'next/link'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusPill } from '@/components/ui/StatusPill'
import { Table, TableWrapper, Td, Th } from '@/components/ui/Table'
import { activeCount } from '@/lib/posting-pipeline'
import { cn } from '@/lib/cn'

export default async function JobPostingsPage() {
  await requireSession()

  const rows = await db.jobPosting.findMany({
    orderBy: { createdAt: 'desc' },
    include: { applicants: { select: { stage: true } } },
  })

  // Open roles first, then most recently created: a recruiter's attention
  // belongs on what is still hiring. Not done in SQL — ordering by the status
  // column sorts alphabetically, which puts "closed" above "open", the exact
  // opposite of what is wanted.
  const postings = [
    ...rows.filter((posting) => posting.status === 'open'),
    ...rows.filter((posting) => posting.status !== 'open'),
  ]

  const openCount = postings.filter((posting) => posting.status === 'open').length

  return (
    <div>
      <PageHeader
        title="Job postings"
        subtitle={`${openCount} open · ${postings.length} total`}
      />

      {postings.length === 0 ? (
        <EmptyState
          data-testid="empty-state"
          title="No job postings yet"
          message="Roles you open will appear here with their applicant pipeline."
        />
      ) : (
        <Card className="p-0">
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Role</Th>
                  <Th>Department</Th>
                  <Th>Status</Th>
                  <Th className="text-right">In pipeline</Th>
                  <Th className="text-right">Total applicants</Th>
                </tr>
              </thead>
              <tbody data-testid="job-postings-list">
                {postings.map((posting) => {
                  const active = activeCount(posting.applicants)
                  const closed = posting.status !== 'open'

                  return (
                    <tr
                      key={posting.id}
                      data-testid={`posting-row-${posting.id}`}
                      // Closed postings are dimmed as well as pilled, so the
                      // distinction survives a quick scan down the column.
                      className={cn(closed ? 'opacity-65' : 'hover:bg-rail/60')}
                    >
                      <Td>
                        <Link
                          href={`/job-postings/${posting.id}`}
                          className="font-medium text-ink underline-offset-2 hover:underline"
                        >
                          {posting.title}
                        </Link>
                      </Td>
                      <Td className="text-ink-muted">{posting.department}</Td>
                      <Td>
                        <StatusPill status={posting.status} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        {active > 0 ? (
                          <span className="text-ink">{active}</span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </Td>
                      <Td className="text-right tabular-nums text-ink-muted">
                        {posting.applicants.length}
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
