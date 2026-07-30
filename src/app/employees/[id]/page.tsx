import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { resolveEffectivePermissions, hasPermission } from '@/lib/permissions'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

  const permissions = await resolveEffectivePermissions(session.userId)
  if (!hasPermission(permissions, 'view_all_employees')) redirect('/dashboard')

  const { id } = await params
  const employee = await db.employee.findUnique({ where: { id } })
  if (!employee) notFound()

  return (
    <div className="p-8" data-testid="employee-detail">
      <h1 className="text-2xl font-bold">{employee.name}</h1>
      <p data-testid="employee-department">{employee.department}</p>
      <p data-testid="employee-title">{employee.title}</p>
      <p data-testid="employee-status">{employee.status}</p>
    </div>
  )
}
