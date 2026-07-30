import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { resolveEffectivePermissions, hasPermission } from '@/lib/permissions'

export default async function AdminRolesPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

  const permissions = await resolveEffectivePermissions(session.userId)
  if (!hasPermission(permissions, 'manage_roles')) redirect('/dashboard')

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
