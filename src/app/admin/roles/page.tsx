import { db } from '@/lib/db'

export default async function AdminRolesPage() {
  const roles = await db.role.findMany({ include: { permissions: { include: { permission: true } } } })
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Roles</h1>
      <ul data-testid="roles-list">
        {roles.map((r) => (
          <li key={r.id} data-testid={`role-row-${r.id}`}>
            <strong>{r.name}</strong>: {r.permissions.map((rp) => rp.permission.key).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  )
}
