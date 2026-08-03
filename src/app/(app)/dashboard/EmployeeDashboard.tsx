import Link from 'next/link'
import { db } from '@/lib/db'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusPill } from '@/components/ui/StatusPill'
import { isTerminated, tenureLabel } from '@/lib/employees'

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

/**
 * The zero-permission variant. An employee holds no permission keys at all, so
 * this screen is built only from things they are entitled to: their own
 * employee record, who they report to, and the internal job board — which is
 * open to any authenticated user and is the one genuinely useful destination
 * they can reach.
 *
 * Nothing here reads the roster. Colleagues, headcount, and other people's
 * records all sit behind view_all_employees, which this user does not hold.
 */
export async function EmployeeDashboard({ userId, email }: { userId: string; email: string }) {
  const [employee, openPostings] = await Promise.all([
    db.employee.findUnique({
      where: { userId },
      include: { manager: { select: { name: true, title: true } } },
    }),
    db.jobPosting.findMany({
      where: { status: 'open' },
      select: { id: true, title: true, department: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const now = new Date()

  return (
    <div data-testid="dashboard-employee">
      <PageHeader
        title={employee ? `Welcome back, ${employee.name.split(' ')[0]}` : 'Welcome'}
        subtitle={employee ? undefined : 'Your account is not linked to an employee record'}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <Label>Your details</Label>
          {employee ? (
            <>
              <div className="mt-3 flex items-start gap-3">
                <Avatar name={employee.name} className="h-11 w-11 text-sm" />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink">{employee.title}</p>
                  <p className="text-sm text-ink-muted">{employee.department}</p>
                </div>
                <div className="ml-auto">
                  <StatusPill status={employee.status} positive={!isTerminated(employee)} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
                <div>
                  <Label>Started</Label>
                  <p className="mt-1 text-sm text-ink">{DATE_FORMAT.format(employee.hireDate)}</p>
                </div>
                <div>
                  <Label>Tenure</Label>
                  <p className="mt-1 text-sm text-ink">{tenureLabel(employee.hireDate, now)}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <Label>Reports to</Label>
                {employee.manager ? (
                  <div className="mt-2 flex items-center gap-2.5">
                    <Avatar name={employee.manager.name} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {employee.manager.name}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {employee.manager.title}
                      </span>
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">No manager on record</p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-3">
              <EmptyState
                data-testid="empty-state"
                title="No employee record"
                message={`${email} is not linked to an employee record, so there are no details to show.`}
              />
            </div>
          )}
        </Card>

        <Card>
          <Label>Open roles</Label>
          <p className="mt-1 text-xs text-ink-muted">
            Internal openings across the company.
          </p>
          {openPostings.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-muted">
              No roles are open right now
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {openPostings.map((posting) => (
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
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
