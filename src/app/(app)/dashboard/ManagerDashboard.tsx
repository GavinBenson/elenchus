import Link from 'next/link'
import { db } from '@/lib/db'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { StatusPill } from '@/components/ui/StatusPill'
import { Table, TableWrapper, Td, Th } from '@/components/ui/Table'
import { isTerminated, sortRoster, tenureLabel } from '@/lib/employees'
import { cn } from '@/lib/cn'

export async function ManagerDashboard({ userId }: { userId: string }) {
  const employee = await db.employee.findUnique({
    where: { userId },
    include: {
      reports: {
        include: { _count: { select: { reports: true } } },
      },
    },
  })

  const reports = sortRoster(employee?.reports ?? [])
  const now = new Date()
  const activeReports = reports.filter((report) => !isTerminated(report)).length
  // Someone who manages managers: worth surfacing, since their org is larger
  // than their direct line.
  const secondLine = reports.reduce((sum, report) => sum + report._count.reports, 0)

  return (
    <div data-testid="dashboard-manager">
      <PageHeader
        title="Your team"
        subtitle={employee ? `${employee.title} · ${employee.department}` : 'Your direct reports'}
      />

      {reports.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 pb-4 lg:grid-cols-3">
          <StatTile data-testid="stat-tile-reports" label="Direct reports" value={activeReports} />
          <StatTile
            data-testid="stat-tile-org-size"
            label="Whole org below you"
            value={activeReports + secondLine}
            hint={secondLine > 0 ? `${secondLine} indirect` : 'No second line'}
          />
          {employee ? (
            <StatTile
              data-testid="stat-tile-tenure"
              label="Your tenure"
              value={<span className="text-base">{tenureLabel(employee.hireDate, now)}</span>}
            />
          ) : null}
        </div>
      ) : null}

      <Card className="p-0">
        {/* The table renders even with nobody in it, so manager-reports-list is
            always the row container with a truthful row count — zero. Hiding
            the id in a spare element when empty, or dropping it, would each
            break a different Epic 2 assertion. */}
        <TableWrapper>
          <Table>
            {reports.length > 0 ? (
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Title</Th>
                  <Th>Department</Th>
                  <Th className="text-right">Their reports</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
            ) : null}
            <tbody data-testid="manager-reports-list">
                {reports.map((report) => {
                  const gone = isTerminated(report)

                  return (
                    <tr
                      key={report.id}
                      data-testid={`employee-row-${report.id}`}
                      className={cn(gone ? 'opacity-65' : 'hover:bg-rail/60')}
                    >
                      <Td>
                        <Link
                          href={`/employees/${report.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar name={report.name} />
                          <span className="truncate font-medium text-ink">{report.name}</span>
                        </Link>
                      </Td>
                      <Td className="text-ink-muted">{report.title}</Td>
                      <Td className="text-ink-muted">{report.department}</Td>
                      <Td className="text-right tabular-nums text-ink-muted">
                        {report._count.reports || '—'}
                      </Td>
                      <Td>
                        <StatusPill status={report.status} positive={!gone} />
                      </Td>
                    </tr>
                  )
                })}
            </tbody>
          </Table>
        </TableWrapper>

        {reports.length === 0 ? (
          <div className="p-4">
            <EmptyState
              data-testid="empty-state"
              title="No direct reports"
              message={
                employee
                  ? 'Nobody reports to you yet. When they do, they will be listed here.'
                  : 'Your user account is not linked to an employee record, so your reporting line cannot be resolved.'
              }
            />
          </div>
        ) : null}
      </Card>
    </div>
  )
}
