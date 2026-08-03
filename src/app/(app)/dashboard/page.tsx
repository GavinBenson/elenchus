import { requireSession } from '@/lib/page-auth'
import { AdminDashboard } from './AdminDashboard'
import { RecruiterDashboard } from './RecruiterDashboard'
import { ManagerDashboard } from './ManagerDashboard'
import { EmployeeDashboard } from './EmployeeDashboard'

/**
 * One route, four role variants. Each variant is its own component running its
 * own queries, so a role only ever reads the data it is allowed to see — the
 * recruiter dashboard never touches the employee table, and the employee
 * dashboard reads nothing but that user's own record and the open job board.
 *
 * Employee is the default rather than an explicit branch: an unrecognised role
 * should land on the least-privileged screen, not on nothing.
 */
export default async function DashboardPage() {
  const { user } = await requireSession()

  switch (user.role.name) {
    case 'admin':
      return <AdminDashboard />
    case 'recruiter':
      return <RecruiterDashboard />
    case 'manager':
      return <ManagerDashboard userId={user.id} />
    default:
      return <EmployeeDashboard userId={user.id} email={user.email} />
  }
}
