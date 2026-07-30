import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

export default async function DashboardPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  })
  if (!user) redirect('/login')

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
