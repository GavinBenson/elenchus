import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

export default async function EmployeesPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

  const employees = await db.employee.findMany()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Employees</h1>
      <ul data-testid="employees-list">
        {employees.map((e) => (
          <li key={e.id} data-testid={`employee-row-${e.id}`}>
            <a href={`/employees/${e.id}`}>{e.name}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
