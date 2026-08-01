import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from './db'
import { resolveEffectivePermissions, hasPermission } from './permissions'

describe('permission resolution', () => {
  let roleId: string
  let userId: string
  let grantedPermId: string
  let revokedPermId: string

  beforeAll(async () => {
    const role = await db.role.create({ data: { name: 'perm-test-role' } })
    roleId = role.id
    const granted = await db.permission.create({ data: { key: 'perm-test-granted' } })
    const revoked = await db.permission.create({ data: { key: 'perm-test-revoked' } })
    grantedPermId = granted.id
    revokedPermId = revoked.id
    await db.rolePermission.create({ data: { roleId, permissionId: revokedPermId } })

    // @scratch.test, not @elenchus.test: prisma/seed.test.ts asserts exact
    // counts over @elenchus.test users, so leftover scratch debris from a
    // failed run here must not be able to fail those tests instead.
    const user = await db.user.create({
      data: { email: 'perm-test@scratch.test', passwordHash: 'x', roleId },
    })
    userId = user.id

    // grant an extra permission via override, and revoke one the role has
    await db.userPermissionOverride.create({
      data: { userId, permissionId: grantedPermId, granted: true },
    })
    await db.userPermissionOverride.create({
      data: { userId, permissionId: revokedPermId, granted: false },
    })
  })

  afterAll(async () => {
    await db.userPermissionOverride.deleteMany({ where: { userId } })
    await db.user.delete({ where: { id: userId } })
    await db.rolePermission.deleteMany({ where: { roleId } })
    await db.permission.deleteMany({ where: { id: { in: [grantedPermId, revokedPermId] } } })
    await db.role.delete({ where: { id: roleId } })
  })

  it('includes a permission granted only via override', async () => {
    const perms = await resolveEffectivePermissions(userId)
    expect(hasPermission(perms, 'perm-test-granted')).toBe(true)
  })

  it('excludes a role permission revoked via override', async () => {
    const perms = await resolveEffectivePermissions(userId)
    expect(hasPermission(perms, 'perm-test-revoked')).toBe(false)
  })

  it('returns false for an unknown permission key', async () => {
    const perms = await resolveEffectivePermissions(userId)
    expect(hasPermission(perms, 'does-not-exist')).toBe(false)
  })
})
