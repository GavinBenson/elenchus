import { db } from '@/lib/db'
import { requirePermission } from '@/lib/page-auth'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table, TableWrapper, Td, Th } from '@/components/ui/Table'
import { describePermission } from '@/lib/permission-catalog'
import { cn } from '@/lib/cn'

export default async function AdminRolesPage() {
  // Unchanged: admin-only, exactly as before this PBI.
  await requirePermission('manage_roles')

  const [roles, permissions, overrideCount] = await Promise.all([
    db.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    }),
    db.permission.findMany({ orderBy: { key: 'asc' } }),
    db.userPermissionOverride.count(),
  ])

  // A set per role, so each cell is a lookup rather than a nested scan.
  const grantedByRole = new Map(
    roles.map((role) => [role.id, new Set(role.permissions.map((rp) => rp.permission.key))])
  )

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        subtitle={`${roles.length} roles · ${permissions.length} permissions`}
      />

      {roles.length === 0 || permissions.length === 0 ? (
        <EmptyState
          data-testid="empty-state"
          title="No roles configured"
          message="Roles and their permissions will appear here once they exist."
        />
      ) : (
        <>
          <Card className="p-0">
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>Role</Th>
                    {permissions.map((permission) => (
                      <Th key={permission.id} className="text-center">
                        {describePermission(permission.key)?.label ?? permission.key}
                      </Th>
                    ))}
                    <Th className="text-right">Users</Th>
                  </tr>
                </thead>
                <tbody data-testid="roles-list">
                  {roles.map((role) => {
                    const granted = grantedByRole.get(role.id) ?? new Set<string>()

                    return (
                      <tr
                        key={role.id}
                        data-testid={`role-row-${role.id}`}
                        className="hover:bg-rail/60"
                      >
                        <Td className="font-medium capitalize text-ink">{role.name}</Td>
                        {permissions.map((permission) => {
                          const has = granted.has(permission.key)
                          return (
                            <Td key={permission.id} className="text-center">
                              {/* Symbol plus an accessible name: a bare tick
                                  reads as nothing to a screen reader, and
                                  colour alone would not survive greyscale. */}
                              <span
                                title={`${role.name} ${has ? 'has' : 'does not have'} ${permission.key}`}
                                className={cn(
                                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                                  has ? 'bg-stage-hired-bg text-stage-hired' : 'bg-rail text-ink-muted'
                                )}
                              >
                                <span aria-hidden="true">{has ? '✓' : '·'}</span>
                                <span className="sr-only">{has ? 'granted' : 'not granted'}</span>
                              </span>
                            </Td>
                          )
                        })}
                        <Td className="text-right tabular-nums text-ink-muted">
                          {role._count.users}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </TableWrapper>
          </Card>

          <Card className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              What each permission controls
            </p>
            <dl className="mt-3 flex flex-col gap-3">
              {permissions.map((permission) => {
                const info = describePermission(permission.key)
                return (
                  <div key={permission.id}>
                    <dt className="font-mono text-xs text-ink">{permission.key}</dt>
                    <dd className="mt-0.5 text-xs text-ink-muted">
                      {info?.description ?? 'Not documented.'}
                      {info?.caveat ? (
                        <span className="mt-1 block text-warn">{info.caveat}</span>
                      ) : null}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </Card>

          <Card className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Per-user overrides
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              {overrideCount === 0
                ? 'No user currently overrides their role. The permission engine supports granting or revoking a single key for one user on top of what their role gives them, so this matrix is the default rather than the final word.'
                : `${overrideCount} override${overrideCount === 1 ? '' : 's'} in effect. An override grants or revokes a single key for one user on top of their role, so this matrix is the default rather than the final word for those users.`}
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
