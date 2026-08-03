import Link from 'next/link'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/page-auth'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusPill } from '@/components/ui/StatusPill'
import { Table, TableWrapper, Td, Th } from '@/components/ui/Table'
import { isTerminated, sortRoster } from '@/lib/employees'
import { cn } from '@/lib/cn'

export default async function EmployeesPage() {
  // Unchanged from before this PBI: the roster is gated on view_all_employees,
  // matching the API.
  await requirePermission('view_all_employees')

  const rows = await db.employee.findMany({
    include: {
      manager: { select: { id: true, name: true } },
      _count: { select: { reports: true } },
    },
  })

  const employees = sortRoster(rows)
  const activeCount = employees.filter((employee) => !isTerminated(employee)).length

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${activeCount} active · ${employees.length} total`}
      />

      {employees.length === 0 ? (
        <EmptyState
          data-testid="empty-state"
          title="No employees yet"
          message="People added to the organisation will appear here."
        />
      ) : (
        <Card className="p-0">
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Title</Th>
                  <Th>Department</Th>
                  <Th>Manager</Th>
                  <Th className="text-right">Reports</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody data-testid="employees-list">
                {employees.map((employee) => {
                  const gone = isTerminated(employee)

                  return (
                    <tr
                      key={employee.id}
                      data-testid={`employee-row-${employee.id}`}
                      // Dimmed as well as pilled, so departed staff stay
                      // distinguishable while scanning the column of names.
                      className={cn(gone ? 'opacity-65' : 'hover:bg-rail/60')}
                    >
                      <Td>
                        <Link
                          href={`/employees/${employee.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar name={employee.name} />
                          <span className="truncate font-medium text-ink">{employee.name}</span>
                        </Link>
                      </Td>
                      <Td className="text-ink-muted">{employee.title}</Td>
                      <Td className="text-ink-muted">{employee.department}</Td>
                      <Td className="text-ink-muted">
                        {employee.manager ? (
                          <Link
                            href={`/employees/${employee.manager.id}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {employee.manager.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </Td>
                      <Td className="text-right tabular-nums text-ink-muted">
                        {employee._count.reports || '—'}
                      </Td>
                      <Td>
                        <StatusPill status={employee.status} positive={!gone} />
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
