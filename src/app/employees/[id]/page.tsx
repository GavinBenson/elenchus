import { notFound } from 'next/navigation'
import { db } from '@/lib/db'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
