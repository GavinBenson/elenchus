import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const CreateRoleSchema = z.object({
  name: z.string().min(1),
  permissionKeys: z.array(z.string()).default([]),
})

export async function GET(request: Request) {
  const { userId, permissions } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  if (!hasPermission(permissions, 'manage_roles')) {
    return errorResponse(new ApiError(403, 'forbidden', 'Missing manage_roles permission'))
  }
  const roles = await db.role.findMany({ include: { permissions: { include: { permission: true } } } })
  return Response.json(roles)
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'manage_roles')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing manage_roles permission'))
    }
    const body = parseOrThrow(CreateRoleSchema, await request.json())
    const perms = await db.permission.findMany({ where: { key: { in: body.permissionKeys } } })
    const role = await db.role.create({
      data: {
        name: body.name,
        permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
      },
      include: { permissions: { include: { permission: true } } },
    })
    return Response.json(role, { status: 201 })
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
