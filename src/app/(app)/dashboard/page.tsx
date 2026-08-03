import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'
import { AdminDashboard } from './AdminDashboard'
import { RecruiterDashboard } from './RecruiterDashboard'

/**
 * One route, four role variants. Each variant is its own component running its
 * own queries, so a role only ever reads the data it is allowed to see — the
 * recruiter dashboard never touches the employee table at all, since a
 * recruiter does not hold view_all_employees.
 *
 * The manager and employee variants are still the Epic 1 markup; they are
 * PBI 6.12.
 */
export default async function DashboardPage() {
  const { user } = await requireSession()

  const roleName = user.role.name

  if (roleName === 'admin') return <AdminDashboard />
  if (roleName === 'recruiter') return <RecruiterDashboard />

  if (roleName === 'manager') {
    const employee = await db.employee.findUnique({ where: { userId: user.id } })
    const reports = employee
      ? await db.employee.findMany({ where: { managerId: employee.id } })
      : []
    return (
      <div data-testid="dashboard-manager" className="p-8">
        <h1 className="text-2xl font-bold">Your reports</h1>
        <ul data-testid="manager-reports-list">
          {reports.map((r) => (
            <li key={r.id}>{r.name}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div data-testid="dashboard-employee" className="p-8">
      <h1 className="text-2xl font-bold">Welcome</h1>
    </div>
  )
}
