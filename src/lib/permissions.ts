import { db } from './db'

export async function resolveEffectivePermissions(userId: string): Promise<Set<string>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      overrides: { include: { permission: true } },
    },
  })
  if (!user) return new Set()

  const effective = new Set<string>(
    user.role.permissions.map((rp) => rp.permission.key)
  )

  for (const override of user.overrides) {
    if (override.granted) {
      effective.add(override.permission.key)
    } else {
      effective.delete(override.permission.key)
    }
  }

  return effective
}

export function hasPermission(permissions: Set<string>, key: string): boolean {
  return permissions.has(key)
}
