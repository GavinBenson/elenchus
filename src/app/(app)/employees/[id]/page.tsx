import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/page-auth'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusPill } from '@/components/ui/StatusPill'
import { isTerminated, sortRoster, tenureLabel } from '@/lib/employees'
import { cn } from '@/lib/cn'

// UTC and a fixed locale, matching the seed's midnight-UTC anchoring.
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{children}</p>
  )
}

function PersonLink({
  employee,
}: {
  employee: { id: string; name: string; title: string; status: string }
}) {
  const gone = isTerminated(employee)

  return (
    <Link
      href={`/employees/${employee.id}`}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border border-line bg-panel p-2.5 transition-colors hover:border-accent',
        gone && 'opacity-65'
      )}
    >
      <Avatar name={employee.name} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{employee.name}</span>
        <span className="block truncate text-xs text-ink-muted">{employee.title}</span>
      </span>
    </Link>
  )
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('view_all_employees')

  const { id } = await params
  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      // The hierarchy is in the schema but was invisible in the UI until now.
      // Two levels up gives the reader a sense of where this person sits
      // without loading the whole tree.
      manager: {
        select: {
          id: true,
          name: true,
          title: true,
          status: true,
          manager: { select: { id: true, name: true, title: true, status: true } },
        },
      },
      reports: { select: { id: true, name: true, title: true, status: true } },
    },
  })
  if (!employee) notFound()

  const now = new Date()
  const gone = isTerminated(employee)
  const reports = sortRoster(employee.reports)

  return (
    <div data-testid="employee-detail">
      <PageHeader
        title={employee.name}
        actions={
          <Link
            href="/employees"
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink"
          >
            All employees
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-start gap-3">
              <Avatar name={employee.name} className={cn('h-11 w-11 text-sm', gone && 'opacity-65')} />
              <div className="min-w-0">
                <p data-testid="employee-title" className="text-base font-semibold text-ink">
                  {employee.title}
                </p>
                <p data-testid="employee-department" className="text-sm text-ink-muted">
                  {employee.department}
                </p>
              </div>
              <div className="ml-auto">
                <StatusPill
                  data-testid="employee-status"
                  status={employee.status}
                  positive={!gone}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
              <div>
                <Label>Hired</Label>
                <p className="mt-1 text-sm text-ink">{DATE_FORMAT.format(employee.hireDate)}</p>
              </div>
              <div>
                <Label>Tenure</Label>
                {gone ? (
                  // The schema records no termination date, so tenure for a
                  // departed employee can only be measured to today — a figure
                  // that keeps growing after they leave. Better to say nothing
                  // than to state a length of service that is not true.
                  <p className="mt-1 text-sm text-ink-muted">No end date recorded</p>
                ) : (
                  <p className="mt-1 text-sm text-ink">{tenureLabel(employee.hireDate, now)}</p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <Label>
              Direct reports {reports.length > 0 ? `(${reports.length})` : ''}
            </Label>
            {reports.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-muted">
                No direct reports
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {reports.map((report) => (
                  <PersonLink key={report.id} employee={report} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <Label>Reports to</Label>
            {employee.manager ? (
              <div className="mt-3 flex flex-col gap-2">
                <PersonLink employee={employee.manager} />
                {employee.manager.manager ? (
                  <>
                    <p className="pl-1 text-[10px] uppercase tracking-wider text-ink-muted">
                      Who reports to
                    </p>
                    <PersonLink employee={employee.manager.manager} />
                  </>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-muted">
                No manager — top of the reporting line
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
