import { db } from '@/lib/db'
import { requirePermission } from '@/lib/page-auth'

export default async function AdminRolesPage() {
  await requirePermission('manage_roles')

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
