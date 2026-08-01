import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/page-auth'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('view_all_employees')

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
