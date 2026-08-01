import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'

export default async function DashboardPage() {
  const { user } = await requireSession()

  const roleName = user.role.name

  if (roleName === 'admin') {
    const [employeeCount, postingCount, applicantCount] = await Promise.all([
      db.employee.count(),
      db.jobPosting.count(),
      db.applicant.count(),
    ])
    return (
      <div data-testid="dashboard-admin" className="p-8">
        <h1 className="text-2xl font-bold">Org-wide stats</h1>
        <p data-testid="stat-employee-count">Employees: {employeeCount}</p>
        <p data-testid="stat-posting-count">Job postings: {postingCount}</p>
        <p data-testid="stat-applicant-count">Applicants: {applicantCount}</p>
      </div>
    )
  }

  if (roleName === 'manager') {
    const employee = await db.employee.findUnique({ where: { userId: user.id } })
    const reports = employee ? await db.employee.findMany({ where: { managerId: employee.id } }) : []
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

  if (roleName === 'recruiter') {
    const postings = await db.jobPosting.findMany({ where: { status: 'open' } })
    return (
      <div data-testid="dashboard-recruiter" className="p-8">
        <h1 className="text-2xl font-bold">Open postings</h1>
        <ul data-testid="recruiter-postings-list">
          {postings.map((p) => (
            <li key={p.id}>{p.title}</li>
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
