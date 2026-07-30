import { db } from '@/lib/db'

export default async function EmployeesPage() {
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
